require "rails_helper"

RSpec.describe "Api::V1::Registration", type: :request do
  def json
    JSON.parse(response.body)
  end

  def stub_mode(mode)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return(mode)
  end

  def valid_params(overrides = {})
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
      password_confirmation: "correct-horse",
      consent_news_email: false,
      consent_to_data_processing: true
    }.merge(overrides)
  end

  describe "POST /api/v1/registration" do
    it "creates the account, signs it in and answers with the payload" do
      post "/api/v1/registration", params: valid_params, as: :json

      expect(response).to have_http_status(:created)
      expect(json["currentUser"]).to include(
        "name" => "Ada Lovelace (test user)",
        "email" => "ada@example.com"
      )

      # The session cookie the response set is what matters, not the body.
      get "/api/v1/session"
      expect(json["currentUser"]["email"]).to eq "ada@example.com"
    end

    it "records the news-email consent" do
      post "/api/v1/registration",
           params: valid_params(consent_news_email: true), as: :json

      expect(User.find_by(email: "ada@example.com").consent_news_email).to be true
    end

    it "remembers the new account, as login does" do
      post "/api/v1/registration", params: valid_params, as: :json

      expect(User.find_by(email: "ada@example.com").remember_created_at)
        .to be_present
    end

    it "is 422 with per-field messages when the passwords do not match" do
      post "/api/v1/registration",
           params: valid_params(password_confirmation: "something-else"),
           as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]).to include("code" => "validation_failed")
      expect(json["error"]["fields"]).to have_key("password_confirmation")
      expect(User.find_by(email: "ada@example.com")).to be_nil
    end

    it "is 422 when data-processing consent is withheld" do
      post "/api/v1/registration",
           params: valid_params(consent_to_data_processing: false), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["fields"]).to have_key("consent_to_data_processing")
    end

    it "is 422 with a blank name, rather than raising" do
      # Not an @example.com address here: User#name appends " (test user)"
      # for User#test_user? accounts, which would make a blank name non-blank
      # by the time the presence validation reads it.
      post "/api/v1/registration",
           params: valid_params(name: "", email: "ada@realmail.example"),
           as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]["fields"]).to have_key("name")
    end

    # UserErrorsConcern builds this message with link_to, so without stripping
    # it would reach React as a literal <a> tag.
    it "strips the markup out of the duplicate-email message" do
      create(:user, name: "Ada", email: "ada@example.com")

      post "/api/v1/registration", params: valid_params, as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      messages = json["error"]["messages"].join(" ")
      expect(messages).to include("already exists")
      expect(messages).to include("Log in instead.")
      expect(messages).not_to include("<a")
      expect(messages).not_to include("href")
    end

    it "is 422 when the honeypot is filled in" do
      post "/api/v1/registration",
           params: valid_params(nickname: "spambot"), as: :json

      expect(response).to have_http_status(:unprocessable_entity)
      expect(json["error"]).to include("code" => "spam_detected")
      expect(User.find_by(email: "ada@example.com")).to be_nil
    end

    it "ignores an empty honeypot" do
      post "/api/v1/registration",
           params: valid_params(nickname: ""), as: :json

      expect(response).to have_http_status(:created)
    end

    it "is 403 while logins are closed" do
      stub_mode("closed-warm-up")

      post "/api/v1/registration", params: valid_params, as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]).to include("code" => "logins_closed")
    end

    context "with the entry form's answers stashed in the session" do
      let!(:constituency) do
        create(:ons_constituency, name: "Woking", ons_id: "E14001063")
      end
      let!(:green) { create(:party, name: "Green", color: "#6AB023") }
      let!(:labour) { create(:party, name: "Labour", color: "#DC241f") }

      it "applies a stash written by the SPA's pre_populate endpoint" do
        post "/api/v1/pre_populate",
             params: {
               constituency_ons_id: "E14001063",
               preferred_party_id: green.id,
               willing_party_id: labour.id
             }, as: :json

        post "/api/v1/registration", params: valid_params, as: :json

        expect(response).to have_http_status(:created)
        user = User.find_by(email: "ada@example.com")
        expect(user.constituency_ons_id).to eq "E14001063"
        expect(user.preferred_party).to eq green
        expect(user.willing_party).to eq labour
      end

      # The legacy /swap deep link stores whatever a partner site sent, not a
      # Party#name, so names are matched canonically — the same rule
      # HomeController#prepopulate_fields_from_session uses. Underscore, not
      # hyphen: ApplicationHelper#canonical_name only strips characters that
      # #parameterize itself treats as invalid, and a hyphen already passes
      # that check, so "green-party" would not canonicalise down to "green".
      it "applies a stash written by the legacy /swap deep link" do
        get "/swap", params: {
          preferred_party_name: "green_party",
          willing_party_name: "LABOUR",
          constituency_name: "Woking"
        }

        post "/api/v1/registration", params: valid_params, as: :json

        user = User.find_by(email: "ada@example.com")
        expect(user.constituency_ons_id).to eq "E14001063"
        expect(user.preferred_party).to eq green
        expect(user.willing_party).to eq labour
      end

      it "clears the stash once it has been applied" do
        post "/api/v1/pre_populate",
             params: { constituency_ons_id: "E14001063" }, as: :json

        post "/api/v1/registration", params: valid_params, as: :json

        # Registering a second account must not inherit the first one's answers.
        delete "/api/v1/session"
        post "/api/v1/registration",
             params: valid_params(email: "grace@example.com"), as: :json

        expect(User.find_by(email: "grace@example.com").constituency_ons_id)
          .to be_nil
      end

      it "ignores a party name that matches nothing" do
        get "/swap", params: { preferred_party_name: "no-such-party" }

        post "/api/v1/registration", params: valid_params, as: :json

        expect(response).to have_http_status(:created)
        expect(User.find_by(email: "ada@example.com").preferred_party).to be_nil
      end
    end

    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      it "rejects a sign-up without a valid CSRF token, as JSON" do
        post "/api/v1/registration",
             params: valid_params,
             headers: { "X-CSRF-Token" => "not-the-token" },
             as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
      end
    end
  end
end

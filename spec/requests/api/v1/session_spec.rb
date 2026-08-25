require "rails_helper"

RSpec.describe "Api::V1::Session", type: :request do
  include Devise::Test::IntegrationHelpers

  def json
    JSON.parse(response.body)
  end

  def stub_mode(mode)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return(mode)
  end

  describe "GET /api/v1/session" do
    context "when logged out" do
      it "succeeds with a null user" do
        get "/api/v1/session"

        expect(response).to have_http_status(:ok)
        expect(json["currentUser"]).to be_nil
        expect(json["swap"]).to be_nil
      end

      it "reports the operational phase and its flags" do
        stub_mode("open")

        get "/api/v1/session"

        expect(json["appMode"]).to eq "open"
        expect(json["flags"]).to eq(
          "loginsOpen" => true,
          "swappingOpen" => true,
          "votingOpen" => false,
          "votingInfoLocked" => false
        )
      end

      it "closes logins and swapping during closed-warm-up" do
        stub_mode("closed-warm-up")

        get "/api/v1/session"

        expect(json["appMode"]).to eq "closed-warm-up"
        expect(json["flags"]).to include(
          "loginsOpen" => false,
          "swappingOpen" => false
        )
      end

      it "opens both swapping and voting during open-and-voting" do
        stub_mode("open-and-voting")

        get "/api/v1/session"

        expect(json["flags"]).to include(
          "swappingOpen" => true,
          "votingOpen" => true
        )
      end
    end

    context "when logged in" do
      let(:user) { create(:ready_to_swap_user1) }

      before { sign_in user }

      it "serializes the current user in the shape types/api.ts expects" do
        get "/api/v1/session"

        expect(response).to have_http_status(:ok)
        expect(json["currentUser"]).to include(
          "id" => user.id,
          "name" => user.name,
          "email" => user.email,
          "hasConstituency" => true,
          "constituencyName" => "Constituency1",
          "constituencyOnsId" => user.constituency.ons_id,
          "mobileVerified" => false,
          "mobileSetButNotVerified" => false
        )
        expect(json["currentUser"]["imageUrl"]).to be_present
        expect(json["currentUser"]["preferredParty"]).to include("name" => "PartyA")
        expect(json["currentUser"]["willingParty"]).to include("name" => "PartyB")
      end

      it "reports a user with no constituency as incomplete" do
        sign_in create(:user, name: "Incomplete Ivy")

        get "/api/v1/session"

        expect(json["currentUser"]).to include(
          "hasConstituency" => false,
          "constituencyName" => nil,
          "preferredParty" => nil,
          "willingParty" => nil
        )
      end

      it "distinguishes a set-but-unverified mobile from a verified one" do
        user.create_mobile_phone!(number: "07771 111 111", verified: false)

        get "/api/v1/session"

        expect(json["currentUser"]).to include(
          "mobileVerified" => false,
          "mobileSetButNotVerified" => true
        )
      end

      it "has no swap when the user is not swapped" do
        get "/api/v1/session"

        expect(json["swap"]).to be_nil
      end
    end

    context "when the user has a swap" do
      let(:chooser) { create(:ready_to_swap_user1) }
      let(:chosen) { create(:ready_to_swap_user2) }
      let(:swap) do
        create(:swap, chosen_user: chosen).tap do |s|
          chooser.update!(outgoing_swap: s)
        end
      end

      # `swap` is what wires the two users together, so force it before each
      # example rather than relying on an assertion to touch it first. The
      # examples then sign in with a reloaded record: sign_in hands Warden the
      # object it is given, and these were instantiated before the swap
      # existed, so their associations would still be cached as empty.
      before { swap }

      it "is 'outgoing' for the user who chose, naming their partner" do
        sign_in chooser.reload

        get "/api/v1/session"

        expect(json["swap"]).to include(
          "id" => swap.id,
          "state" => "outgoing",
          "confirmed" => false
        )
        expect(json["swap"]["partner"]).to include(
          "name" => chosen.name,
          "constituencyName" => "Constituency2"
        )
        # The partner's email is only ever shared through the explicit consent
        # step in the swap flow, never through the session payload.
        expect(json["swap"]["partner"]).not_to have_key("email")
      end

      it "is 'incoming' for the user who was chosen" do
        sign_in chosen.reload

        get "/api/v1/session"

        expect(json["swap"]).to include("state" => "incoming")
        expect(json["swap"]["partner"]).to include(
          "name" => chooser.name
        )
      end

      it "locks voting info once voting is open and the swap is confirmed" do
        stub_mode("open-and-voting")
        swap.update!(confirmed: true)
        sign_in chooser.reload

        get "/api/v1/session"

        expect(json["swap"]).to include("confirmed" => true)
        expect(json["flags"]).to include("votingInfoLocked" => true)
      end

      it "does not lock voting info while the swap is unconfirmed" do
        stub_mode("open-and-voting")
        sign_in chooser.reload

        get "/api/v1/session"

        expect(json["flags"]).to include("votingInfoLocked" => false)
      end
    end
  end

  describe "POST /api/v1/session" do
    let!(:user) { create(:ready_to_swap_user1) }

    it "logs the user in and answers with the logged-in payload" do
      post "/api/v1/session",
           params: { email: user.email, password: "john-password" },
           as: :json

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]).to include("id" => user.id)

      # The session cookie the response set is what matters, not the body.
      get "/api/v1/session"
      expect(json["currentUser"]).to include("id" => user.id)
    end

    it "matches the email case-insensitively, as Devise stores it downcased" do
      post "/api/v1/session",
           params: { email: user.email.upcase, password: "john-password" },
           as: :json

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]).to include("id" => user.id)
    end

    it "remembers the user, as the legacy form's remember_me: 1 did" do
      post "/api/v1/session",
           params: { email: user.email, password: "john-password" },
           as: :json

      expect(user.reload.remember_created_at).to be_present
    end

    # The same body for both, so the endpoint is not an account-existence
    # oracle: a wrong password and an unknown address are indistinguishable.
    it "is 401 with a generic message when the password is wrong" do
      post "/api/v1/session",
           params: { email: user.email, password: "not-the-password" },
           as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to include("code" => "invalid_credentials")
      expect(json["error"]["messages"].join).not_to match(/password|email/i)
    end

    it "is 401 with the same body when no such account exists" do
      post "/api/v1/session",
           params: { email: "nobody@example.com", password: "john-password" },
           as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to include("code" => "invalid_credentials")
    end

    it "is 401 for an account with no password, such as a social sign-up" do
      social = create(:user, name: "Social Sal")
      social.update_column(:encrypted_password, "")

      post "/api/v1/session",
           params: { email: social.email, password: "" },
           as: :json

      expect(response).to have_http_status(:unauthorized)
    end

    # A blank email would otherwise reach `lower(email) = ''`, which matches
    # the blank-email row a social sign-up leaves behind.
    it "is 401 when the email is blank, without looking anyone up" do
      create(:user, name: "Social Sal").update_column(:email, "")

      post "/api/v1/session", params: { password: "john-password" }, as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to include("code" => "invalid_credentials")
    end

    it "is 401 when the email is not a scalar, which permit drops" do
      post "/api/v1/session",
           params: { email: { "$ne" => "" }, password: "john-password" },
           as: :json

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to include("code" => "invalid_credentials")
    end

    it "is 403 while logins are closed" do
      stub_mode("closed-warm-up")

      post "/api/v1/session",
           params: { email: user.email, password: "john-password" },
           as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]).to include("code" => "logins_closed")
    end

    # Devise prepends require_no_authentication to its own SessionsController
    # for this reason: an already-signed-in caller must not be able to swap
    # accounts through the login endpoint.
    it "is 403 when the caller is already logged in" do
      other = create(:user, name: "Already Alice")
      sign_in other

      post "/api/v1/session",
           params: { email: user.email, password: "john-password" },
           as: :json

      expect(response).to have_http_status(:forbidden)
      expect(json["error"]).to include("code" => "already_authenticated")

      get "/api/v1/session"
      expect(json["currentUser"]).to include("id" => other.id)
    end

    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      # The SPA shell is the only place the browser ever reads a token from,
      # and csrf_meta_tags render nothing unless forgery protection is on.
      def meta_csrf_token
        response.body[/name="csrf-token" content="([^"]+)"/, 1]
      end

      it "rejects a login without a valid CSRF token, as JSON" do
        post "/api/v1/session",
             params: { email: user.email, password: "john-password" },
             headers: { "X-CSRF-Token" => "not-the-token" },
             as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
      end

      # Legacy POST /users/sign_in rotates through warden.authenticate!;
      # `sign_in(user, event: :authentication)` is what keeps this endpoint
      # from being the weaker of the two.
      it "rotates the session's CSRF token on login" do
        get "/app/login"
        session_token_before = session[:_csrf_token]
        expect(meta_csrf_token).to be_present

        post "/api/v1/session",
             params: { email: user.email, password: "john-password" },
             headers: { "X-CSRF-Token" => meta_csrf_token },
             as: :json

        expect(response).to have_http_status(:ok)
        expect(session[:_csrf_token]).to be_present
        expect(session[:_csrf_token]).not_to eq session_token_before
      end

      # Rotation would strand the SPA otherwise: it read its token from a meta
      # tag at page load and has no other way to learn the replacement.
      it "hands back a token the next request can use, and retires the old" do
        get "/app/login"
        stale_token = meta_csrf_token

        post "/api/v1/session",
             params: { email: user.email, password: "john-password" },
             headers: { "X-CSRF-Token" => stale_token },
             as: :json

        rotated_token = response.headers["X-CSRF-Token"]
        expect(rotated_token).to be_present

        delete "/api/v1/session", headers: { "X-CSRF-Token" => stale_token }
        expect(response).to have_http_status(:unprocessable_entity)

        delete "/api/v1/session", headers: { "X-CSRF-Token" => rotated_token }
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe "DELETE /api/v1/session" do
    let(:user) { create(:user) }

    it "logs the user out and returns the logged-out payload" do
      sign_in user

      delete "/api/v1/session"

      expect(response).to have_http_status(:ok)
      expect(json["currentUser"]).to be_nil

      get "/api/v1/session"
      expect(json["currentUser"]).to be_nil
    end

    # The bare, all-scopes `sign_out` reaches Warden::Proxy#logout with no
    # scopes, which calls reset_session! — so the token the SPA is holding
    # dies with the rest of the session, and the logged-out client still has
    # to be able to POST a login with the replacement.
    it "clears the session, rotating the CSRF token, on logout" do
      # A real login, not the sign_in test helper, so session[:_csrf_token]
      # is genuinely populated (csrf_cleaner rotates it on authentication) —
      # sign_in bypasses Warden entirely and never touches it.
      post "/api/v1/session",
           params: { email: user.email, password: "john-password" }, as: :json
      # The raw session value, not the response header: form_authenticity_token
      # masks it with a fresh one-time pad on every call, so two header reads
      # always differ even when the underlying session token has not rotated.
      raw_token_before = session[:_csrf_token]
      expect(raw_token_before).to be_present

      # Anything the entry form stashed ahead of logging in is session state
      # too — proof the session was actually thrown away, not just the user.
      post "/api/v1/pre_populate", params: {}, as: :json
      expect(session[:pre_populate]).to be_present

      delete "/api/v1/session"

      expect(response.headers["X-CSRF-Token"]).to be_present
      expect(session[:_csrf_token]).to be_present
      expect(session[:_csrf_token]).not_to eq raw_token_before
      expect(session[:pre_populate]).to be_nil
    end

    it "is 401 with the error convention when not logged in" do
      delete "/api/v1/session"

      expect(response).to have_http_status(:unauthorized)
      expect(json["error"]).to include("code" => "unauthenticated")
      expect(json["error"]["messages"]).to be_an(Array)
    end

    context "with forgery protection on (as in production)" do
      around do |example|
        original = ActionController::Base.allow_forgery_protection
        ActionController::Base.allow_forgery_protection = true
        example.run
        ActionController::Base.allow_forgery_protection = original
      end

      it "rejects a non-GET without a valid CSRF token, as JSON" do
        sign_in user

        delete "/api/v1/session", headers: { "X-CSRF-Token" => "not-the-token" }

        expect(response).to have_http_status(:unprocessable_entity)
        expect(json["error"]).to include("code" => "invalid_authenticity_token")
      end

      it "still allows the unprotected GET" do
        sign_in user

        get "/api/v1/session"

        expect(response).to have_http_status(:ok)
      end
    end
  end
end

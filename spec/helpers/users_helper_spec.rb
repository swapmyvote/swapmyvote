require "rails_helper"

RSpec.describe UsersHelper, type: :helper do
  let(:name) { "Alice Bloggs" }
  let(:user) { create(:user, name: name) }

  describe "#user_profile_link" do
    let(:profile_url) { "https://facebook.com/alice.bloggs" }

    it "returns name when there is no profile URL" do
      user.create_identity(provider: :facebook)
      expect(helper.user_profile_link(user)) .to eq "Alice Bloggs (test user)"
    end

    it "returns a link when there is a profile URL" do
      user.create_identity(provider: :facebook, profile_url: profile_url)
      expect(helper.user_profile_link(user)) \
        .to eq '<a href="https://facebook.com/alice.bloggs">' +
               "Alice Bloggs (test user)</a>"
    end
  end

  describe "#contact_methods" do
    let(:other_user) { create(:user, name: "Bob Jones",
                              email: "bob@example.com") }

    shared_examples "contact methods" do
      let(:methods) { helper.contact_methods(user.swapped_with) }

      it "returns no contact methods" do
        expect(methods).to eq []
      end

      def other_gives_consent
        if swap.chosen_user == other_user
          swap.consent_share_email_chosen = true
        else
          swap.consent_share_email_chooser = true
        end
        swap.save!
      end

      context "who has Facebook with profile not shared" do
        before do
          other_user.create_identity(provider: "facebook")
        end

        it "doesn't return any methods" do
          expect(methods).to eq []
        end

        it "returns just email" do
          other_gives_consent
          expect(methods.length).to eq 1
          expect(methods[0]).to eq \
            %(by email at <a href="mailto:bob%40example.com">bob@example.com</a>)
        end
      end

      context "who has Facebook" do
        before do
          other_user.create_identity(
            provider: "facebook",
            profile_url: "https://facebook.com/bob.jones")
        end

        def assert_first_facebook
          expect(methods[0]).to \
            include %(<a href="https://facebook.com/bob.jones">on Facebook</a>)
        end

        it "returns Facebook link" do
          expect(methods.length).to eq 1
          assert_first_facebook
        end

        it "returns Facebook link and email" do
          other_gives_consent
          expect(methods.length).to eq 2
          assert_first_facebook
          expect(methods[1]).to eq \
            %(by email at <a href="mailto:bob%40example.com">bob@example.com</a>)
        end
      end

      context "who has Twitter" do
        before do
          other_user.create_identity(
            provider: "twitter",
            uid: "12345")
        end

        def assert_first_twitter
          expect(methods[0]).to eq \
            %(<a href="https://twitter.com/intent/user?user_id=12345">on Twitter</a>)
        end

        it "returns Twitter link" do
          expect(methods.length).to eq 1
          assert_first_twitter
        end

        it "returns Twitter link and email with consent" do
          other_gives_consent
          expect(methods.length).to eq 2
          assert_first_twitter
          expect(methods[1]).to eq \
            %(by email at <a href="mailto:bob%40example.com">bob@example.com</a>)
        end
      end
    end

    context "Alice chooses Bob" do
      let(:swap) { create(:swap, chosen_user: other_user) }

      before do
        swap.choosing_user = user
      end

      include_examples "contact methods"
    end

    context "Alice chosen by Bob" do
      let(:swap) { create(:swap, chosen_user: user) }

      before do
        swap.choosing_user = other_user
      end

      include_examples "contact methods"
    end
  end
end

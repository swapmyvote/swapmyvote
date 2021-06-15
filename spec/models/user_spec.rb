require "rails_helper"

# FIXME: this causes a lot of rubocop-rails cops to be unhappy.

RSpec.describe User, type: :model do
  subject { create(:user, name: "Fred") }

  specify { expect(subject).to respond_to(:sent_emails) }

  describe "#constituency" do
    context "with user with no constituency id" do
      let(:no_constituency_user) { create(:user, name: "Fred") }

      it "is nil" do
        expect(no_constituency_user.constituency).to be_nil
      end
    end

    context "with user with constituency id" do
      let(:constituency) { OnsConstituency.create!(name: "test con 1", ons_id: "another-fake-ons-id") }
      let(:user) { create(:user, name: "Test", constituency_ons_id: constituency.ons_id) }

      it "is expected constituency" do
        expect(user.constituency).to eq(constituency)
      end
    end
  end

  describe "#potential_swap_users" do
    let(:user) { create(:user, name: "Fred", id: 1) }

    specify { expect { user.potential_swap_users(5) }.not_to raise_error }
  end

  context "when user has no preferred party, willing party or constituency," do
    let(:no_swap_user) { create(:user, name: "Fred", id: 1) }

    describe "#details_changed?" do
      context "setting constituency" do
        let(:the_change) {
          -> { no_swap_user.constituency_ons_id = "some-fake-ons-id" }
        }

        specify {
          expect(&the_change).to change(no_swap_user, :details_changed?)
                                   .from(false).to(true)
        }
      end

      context "setting preferred_party" do
        let(:the_change) { -> { no_swap_user.preferred_party_id = 3 } }

        specify {
          expect(&the_change).to change(no_swap_user, :details_changed?)
                                           .from(false).to(true)
        }
      end

      context "setting willing_party" do
        let(:the_change) { -> { no_swap_user.willing_party_id = 3 } }

        specify {
          expect(&the_change).to change(no_swap_user, :details_changed?)
                                           .from(false).to(true)
        }
      end
    end
  end

  describe "#try_to_create_potential_swap" do
    before do
      subject.willing_party_id = 2
      subject.preferred_party_id = 3
      subject.constituency_ons_id = 1
      subject.save!
    end

    context "when there is a valid candidate" do
      let(:candidate) {
        create(:user, name: "candidate", email: "c@candidate.com",
               willing_party_id: 3, preferred_party_id: 2, constituency_ons_id: 2)
      }

      it "creates no potential swap without constituency" do
        ps = subject.try_to_create_potential_swap
        expect(ps).to be_nil
      end

      it "creates no potential swap blank constituency" do
        candidate.constituency_ons_id = ""
        candidate.save!
        ps = subject.try_to_create_potential_swap
        expect(ps).to be_nil
      end

      it "creates no potential swap when same constituency" do
        candidate.constituency_ons_id = subject.constituency_ons_id
        candidate.save!
        ps = subject.try_to_create_potential_swap
        expect(ps).to be_nil
      end

      it "creates a potential swap" do
        candidate.constituency_ons_id = 2
        candidate.save!
        ps = subject.try_to_create_potential_swap
        expect(ps.source_user).to eq(subject)
        expect(ps.target_user).to eq(candidate)
      end
    end
  end

  describe "#name" do
    it "adds (test user)" do
      subject.name = "Ada Lovelace"
      subject.email = "ada@example.com"
      expect(subject.name).to eq("Ada Lovelace (test user)")
    end
  end

  describe "#redacted_name" do
    it "redacts the user's surname" do
      subject.name = "Ada Lovelace"
      expect(subject.redacted_name).to eq("Ada L (test user)")
    end

    it "redacts the user's surname and adds (test user)" do
      subject.name = "Ada Lovelace"
      subject.email = "ada@example.com"
      expect(subject.redacted_name).to eq("Ada L (test user)")
    end
  end

  context "-> MobilePhone:" do
    let(:number1) { "07771 111 111" }
    let(:number2) { "07772 222 222" }

    describe "#mobile_phone" do
      it "returns nil after MobilePhone is destroyed" do
        subject.save!
        subject.create_mobile_phone(number: number1)
        subject.mobile_phone.destroy
        expect(subject.mobile_phone.number).to eq(number1)
        subject.reload
        expect(subject.mobile_phone).to be_nil
      end

      it "returns nil after User is destroyed" do
        subject.save!
        subject.create_mobile_phone(number: number1)
        mobile = subject.mobile_phone
        expect(mobile).to be_a(MobilePhone)
        subject.destroy
        expect(MobilePhone.find_by(id: mobile.id)).to be_nil
      end

      it "prevents two users having the same number" do
        subject.save!
        subject.create_mobile_phone(number: number1)
        user2 = create(:user)
        expect {
          user2.create_mobile_phone!(number: number1)
        }.to raise_error(ActiveRecord::RecordInvalid,
                         /Number has already been taken/)
      end
    end

    describe "#mobile_number" do
      it "returns nil" do
        expect(subject.mobile_number).to be_nil
      end

      it "returns a mobile phone number" do
        subject.mobile_phone = MobilePhone.new(number: number1)
        expect(subject.mobile_number).to eq(number1)
      end
    end

    describe "#mobile_number=" do
      before do
        # Required in order to avoid
        #
        #   ActiveRecord::RecordNotSaved:
        #   You cannot call create unless the parent is saved
        #
        # while creating the association from user to mobile_phone
        subject.save!
      end

      it "sets a mobile number for the first time" do
        subject.mobile_number = number1
        subject.reload
        expect(subject.mobile_number).to eq(number1)
        expect(subject.mobile_phone).to be_a(MobilePhone)
        expect(subject.mobile_phone.number).to eq(number1)
      end

      it "sets a new mobile number and deletes the first" do
        subject.mobile_number = number1
        mobile = subject.mobile_phone
        subject.mobile_number = number2
        subject.reload
        expect(subject.mobile_phone.number).to eq(number2)
        expect(subject.mobile_phone.id).not_to eq(mobile.id)
        expect(MobilePhone.find_by(id: mobile.id)).to be_nil
      end

      it "prevents two users having the same number" do
        subject.mobile_number = number1
        user2 = create(:user)
        expect {
          user2.mobile_number = number1
        }.to raise_error(ActiveRecord::RecordInvalid,
                         /Number has already been taken/)
      end
    end
  end

  describe "#send_welcome_email (after_save callback)" do
    context "when the user DOES have an email address" do
      before { subject.update(email: "some@email.address") }

      specify "#save DOES call #send_welcome_email" do
        # rubocop:disable RSpec/SubjectStub
        expect(subject).to receive(:send_welcome_email)
        # rubocop:enable RSpec/SubjectStub
        subject.sent_emails.clear
        subject.save!
      end

      describe "#send_welcome_email" do
        let(:an_email) { double(:an_email) }

        before do
          allow(an_email).to receive(:deliver_now)
          allow(UserMailer).to receive(:welcome_email).and_return(an_email)
        end

        context "when NO previous welcome emails have been sent" do
          before { subject.sent_emails.clear }

          it "sends an email" do
            expect(an_email).to receive(:deliver_now)
            expect(UserMailer).to receive(:welcome_email).with(subject).and_return(an_email)
            subject.save!
          end

          specify { expect { subject.save! }.to change(subject, :needs_welcome_email?).from(true).to(false) }
        end

        context "when previous welcome emails HAVE been sent" do
          before { subject.save! }

          it "does not send another email" do
            # rubocop:disable RSpec/SubjectStub
            expect(subject).not_to receive(:send_welcome_email)
            # rubocop:enable RSpec/SubjectStub
            subject.save!
          end

          specify { expect { subject.save! }.not_to change(subject, :needs_welcome_email?).from(false) }
        end
      end
    end
  end

  describe "#test_user?" do
    it "with no email returns false" do
      subject.email = nil
      expect(subject.test_user?).to be_falsey
    end

    it "with normal email returns false" do
      subject.email = "foo@bar.com"
      expect(subject.test_user?).to be_falsey
    end

    it "with tfbnw.net email returns true" do
      subject.email = "uypqkdhvcs_1575041689@tfbnw.net"
      expect(subject.test_user?).to be_truthy
    end

    it "with example.com email returns true" do
      subject.email = "foo@example.com"
      expect(subject.test_user?).to be_truthy
    end
  end

  describe "#mobile_verification_missing?" do
    context "with no mobile phone" do
      it "returns false" do
        subject.email = nil
        expect(subject.mobile_verification_missing?).to be_truthy
      end
    end

    context "with mobile phone" do
      before do
        subject.save
        subject.build_mobile_phone(user: subject)
      end

      it "no email returns true" do
        expect(subject.mobile_verification_missing?).to be_truthy
      end

      it "normal email returns true" do
        subject.email = "foo@bar.com"
        expect(subject.mobile_verification_missing?).to be_truthy
      end

      it "tfbnw.net email returns true" do
        subject.email = "uypqkdhvcs_1575041689@tfbnw.net"
        expect(subject.mobile_verification_missing?).to be_truthy
      end

      it "example.com email returns true" do
        subject.email = "foo@example.com"
        expect(subject.mobile_verification_missing?).to be_truthy
      end

      context "when skipping test user verification," do
        before do
          ENV["TEST_USERS_SKIP_MOBILE_VERIFICATION"] = "1"
        end

        after do
          ENV.delete("TEST_USERS_SKIP_MOBILE_VERIFICATION")
        end

        it "no email returns true" do
          subject.email = nil
          expect(subject.mobile_verification_missing?).to be_truthy
        end

        it "normal email returns true" do
          subject.email = "foo@bar.com"
          expect(subject.mobile_verification_missing?).to be_truthy
        end

        it "tfbnw.net email returns false" do
          subject.email = "uypqkdhvcs_1575041689@tfbnw.net"
          expect(subject.mobile_verification_missing?).to be_falsey
        end

        it "example.com email returns false" do
          subject.email = "foo@example.com"
          expect(subject.mobile_verification_missing?).to be_falsey
        end
      end
    end
  end

  describe "#email_url" do
    it "makes a mailto: link" do
      subject.email = "foo@example.com"
      expect(subject.email_login?).to be_truthy
      expect(subject.email_url).to eq "mailto:foo%40example.com"
    end

    it "defends against XSS attacks" do
      subject.email =
        'foo@example.com"></a><a href="javascript:evil">email'
      expect(subject.email_url)
        .to eq "mailto:foo%40example.com%22%3E%3C%2Fa%3E%3Ca+" +
                "href%3D%22javascript%3Aevil%22%3Eemail"
    end
  end

  describe "#email_consent?" do
    let(:swap) { build(:swap) }

    it "is false by default" do
      expect(subject.email_consent?).to be_falsey
    end

    context "swapper is chooser and" do
      before do
        subject.outgoing_swap = swap
      end

      it "has consented to share email" do
        swap.consent_share_email_chooser = true
        expect(subject.email_consent?).to be_truthy
      end

      it "has not consented to share email" do
        swap.consent_share_email_chooser = false
        expect(subject.email_consent?).to be_falsey
      end
    end

    context "swapper is chosen and" do
      before do
        subject.incoming_swap = swap
      end

      it "has consented to share email" do
        swap.consent_share_email_chosen = true
        expect(subject.email_consent?).to be_truthy
      end

      it "has not consented to share email" do
        swap.consent_share_email_chosen = false
        expect(subject.email_consent?).to be_falsey
      end
    end
  end

  describe "email validation" do
    it "prevents duplicate emails from being created" do
      expect{create(:user, name: subject.name, email: subject.email)}.to raise_error(ActiveRecord::RecordInvalid)
    end

    it "prevents email from being changed to a duplicate" do
      bob = create(:user, name: "bob")
      bob.email = subject.email
      expect{bob.save!}.to raise_error(ActiveRecord::RecordInvalid)
    end

    it "allows different emails to be being created" do
      expect{create(:user, name: "Bob")}.not_to raise_error
    end
  end

  describe "#my_email_consent?" do
    it "is false by default" do
      expect(subject.my_email_consent?).to be_falsey
    end

    it "swapper is chooser and has consented to share email" do
      confirmed_swap = build(:swap, confirmed: true)
      confirmed_swap.consent_share_email_chooser = true
      subject.outgoing_swap = confirmed_swap

      expect(subject.my_email_consent?).to be_truthy
    end

    it "swapper is chooser and has not consented to share email" do
      confirmed_swap = build(:swap, confirmed: true)
      confirmed_swap.consent_share_email_chooser = false
      subject.outgoing_swap = confirmed_swap

      expect(subject.my_email_consent?).to be_falsey
    end

    it "swapper is chosen and has consented to share email" do
      confirmed_swap = build(:swap, confirmed: true)
      confirmed_swap.consent_share_email_chosen = true
      subject.incoming_swap = confirmed_swap

      expect(subject.my_email_consent?).to be_truthy
    end

    it "swapper is chosen and has not consented to share email" do
      confirmed_swap = build(:swap, confirmed: true)
      confirmed_swap.consent_share_email_chosen = false
      subject.incoming_swap = confirmed_swap

      expect(subject.my_email_consent?).to be_falsey
    end
  end

  context "when user has email login" do
    before do
      subject.email = "foo@example.com"
    end

    specify "#social_profile? is false" do
      expect(subject.social_profile?).to be_falsey
    end

    specify "#email_login? is true" do
      expect(subject.email_login?).to be_truthy
    end
  end

  context "when user has Facebook login" do
    before do
      subject.email = "foo@example.com"
      subject.identity = build(:identity, provider: "facebook", user: subject)
    end

    specify "#social_profile? is true" do
      expect(subject.social_profile?).to be_truthy
    end

    specify "#email_login? is false" do
      expect(subject.email_login?).to be_falsey
    end
  end

  context "when user has Twitter login" do
    before do
      subject.email = "foo@example.com"
      subject.identity = build(:identity, provider: "twitter", user: subject)
    end

    specify "#social_profile? is true" do
      expect(subject.social_profile?).to be_truthy
    end

    specify "#email_login? is false" do
      expect(subject.email_login?).to be_falsey
    end
  end
end

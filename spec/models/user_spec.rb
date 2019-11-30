require "rails_helper"

RSpec.describe User, type: :model do
  specify { expect(subject).to respond_to(:sent_emails) }

  describe "#constituency" do
    context "with user with no constituency id" do
      let(:no_constituency_user) { User.new(email: "fred@example.com", name: "fred") }

      it "is nil" do
        expect(no_constituency_user.constituency).to be_nil
      end
    end

    context "with user with constituency id" do
      let(:constituency) { OnsConstituency.create!(name: "test con 1", ons_id: "another-fake-ons-id") }
      let(:user) { User.new(email: "test@example.com", name: "test user", constituency_ons_id: constituency.ons_id) }

      it "is expected constituency" do
        expect(user.constituency).to eq(constituency)
      end
    end
  end

  describe "#potential_swap_users" do
    let(:user) { User.new(email: "fred@example.com", name: "fred", id: 1) }

    specify { expect { user.potential_swap_users(5) }.not_to raise_error }
  end

  context "when user has no preferred party, willing party or constituency" do
    let(:no_swap_user) { User.new(email: "fred@example.com", name: "fred", id: 1) }

    context "setting constituency" do
      let(:the_change) { -> { no_swap_user.constituency_ons_id = "some-fake-ons-id" } }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
    end

    context "setting preferred_party" do
      let(:the_change) { -> { no_swap_user.preferred_party_id = 3 } }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
    end

    context "setting willing_party" do
      let(:the_change) { -> { no_swap_user.willing_party_id = 3 } }

      specify { expect(&the_change).to change(no_swap_user, :details_changed?).from(false).to(true) }
    end
  end

  describe "#redacted_name" do
    it "redacts the user's surname" do
      subject.name = "Ada Lovelace"
      expect(subject.redacted_name).to eq("Ada L")
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
        expect(MobilePhone.find_by_id(mobile.id)).to be_nil
      end

      it "prevents two users having the same number" do
        subject.save!
        subject.create_mobile_phone(number: number1)
        user2 = User.create!
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
        expect(MobilePhone.find_by_id(mobile.id)).to be_nil
      end

      it "prevents two users having the same number" do
        subject.mobile_number = number1
        user2 = User.create!(email: "fred@example.com", name: "fred")
        expect {
          user2.mobile_number = number1
        }.to raise_error(ActiveRecord::RecordInvalid,
                         /Number has already been taken/)
      end
    end
  end

  describe "#send_welcome_email (after_save callback)" do
    context "when the user does NOT have an email address" do
      before do
        subject.update(email: nil)
        subject.save!
      end

      specify "#save does NOT call #send_welcome_email" do
        is_expected.not_to receive(:send_welcome_email)
        subject.sent_emails.clear
        subject.save!
      end
    end

    context "when the user has an EMPTY email address" do
      before do
        subject.update(email: "")
        subject.save!
      end

      specify "#save does NOT call #send_welcome_email" do
        is_expected.not_to receive(:send_welcome_email)
        subject.sent_emails.clear
        subject.save!
      end
    end

    context "when the user DOES have an email address" do
      before { subject.update(email: "some@email.address") }

      specify "#save DOES call #send_welcome_email" do
        is_expected.to receive(:send_welcome_email)
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
            is_expected.not_to receive(:send_welcome_email)
            subject.save!
          end

          specify { expect { subject.save! }.not_to change(subject, :needs_welcome_email?).from(false) }
        end
      end
    end
  end
end

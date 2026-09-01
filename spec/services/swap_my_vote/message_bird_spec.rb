require "rails_helper"

RSpec.describe SwapMyVote::MessageBird do
  def stub_fake_otp(value)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("MESSAGEBIRD_FAKE_OTP").and_return(value)
  end

  describe "with MESSAGEBIRD_FAKE_OTP set" do
    before { stub_fake_otp("123456") }

    it "creates a verification without calling MessageBird" do
      expect(described_class).not_to receive(:client)

      otp = described_class.verify_create("+447911123456", "template")

      expect(otp.id).to be_present
    end

    it "ignores a delete" do
      expect(described_class).not_to receive(:client)

      expect { described_class.verify_delete("anything") }.not_to raise_error
    end

    it "accepts the fixed token" do
      expect(described_class).not_to receive(:client)

      expect { described_class.verify_token("id", "123456") }
        .not_to raise_error
    end

    # The same exception the real API raises for a wrong code, so the
    # controller's rescue and its reason-mapping are the ones under test in
    # an end-to-end run, not a parallel happy path.
    it "raises MessageBird's own invalid-token error for anything else" do
      expect { described_class.verify_token("id", "000000") }
        .to raise_error(MessageBird::ErrorException) do |ex|
          expect(ex.errors.first.code).to eq 10
          expect(ex.errors.first.description).to match(/token is invalid/)
        end
    end

    it "refuses to run in production" do
      allow(Rails).to receive(:env).and_return(
        ActiveSupport::StringInquirer.new("production")
      )

      expect { described_class.verify_create("+447911123456", "t") }
        .to raise_error(/MESSAGEBIRD_FAKE_OTP/)
    end
  end

  describe "without MESSAGEBIRD_FAKE_OTP" do
    before { stub_fake_otp(nil) }

    it "calls the real client" do
      client = instance_double(MessageBird::Client)
      allow(described_class).to receive(:client).and_return(client)
      expect(client).to receive(:verify_create).and_return(
        MessageBird::Verify.new("id" => "real-1")
      )

      expect(described_class.verify_create("+447911123456", "t").id)
        .to eq "real-1"
    end
  end
end

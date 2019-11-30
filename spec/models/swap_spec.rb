require "rails_helper"

RSpec.describe Swap, type: :model do
  specify { is_expected.to respond_to(:chosen_user) }
  specify { is_expected.to respond_to(:choosing_user) }

  describe ".cancel_old" do
    context "when expired unconfirmed swaps exist" do
      let(:expired_swap) do
        build(:swap, confirmed: false, chosen_user: build(:user), created_at: 49.hours.ago)
      end

      specify "the swap gets destroyed" do
        expired_swap.save!
        allow_any_instance_of(Swap).to receive(:destroy)
        expect(described_class.cancel_old).to include(expired_swap.id)
      end
    end

    context "when swaps exist that are expired but confirmed" do
      let(:keeper_swap) do
        build(:swap, confirmed: true, chosen_user: build(:user), created_at: 49.hours.ago)
      end

      specify "the swap does not get destroyed" do
        keeper_swap.save!
        expect_any_instance_of(Swap).not_to receive(:destroy)
        expect(described_class.cancel_old).not_to include(keeper_swap.id)
      end
    end

    context "when swaps exist that are unconfirmed and not yet expired" do
      let(:keeper_swap) do
        build(:swap, confirmed: false, chosen_user: build(:user), created_at: 1.hours.ago)
      end

      specify "the swap does not get destroyed" do
        keeper_swap.save!
        expect_any_instance_of(Swap).not_to receive(:destroy)
        expect(described_class.cancel_old).not_to include(keeper_swap.id)
      end
    end
  end
end

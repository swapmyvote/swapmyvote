require "rails_helper"

# Specs in this file have access to a helper object that includes
# the SwapsHelper. For example:
#
# describe SwapsHelper do
#   describe "string concat" do
#     it "concats two strings with spaces" do
#       expect(helper.concat_strings("this","that")).to eq("this that")
#     end
#   end
# end
RSpec.describe SwapsHelper, type: :helper do
  describe "#swap_validity_hours" do
    context "when ENV variable not set" do
      before { allow(ENV).to receive(:[]).with("SWAP_EXPIRY_HOURS").and_return(nil)}
      specify { expect(helper.swap_validity_hours).to eq(48)  }
    end

    context "when ENV variable set but empty" do
      before { allow(ENV).to receive(:[]).with("SWAP_EXPIRY_HOURS").and_return("")}
      specify { expect(helper.swap_validity_hours).to eq(48)  }
    end

    context "when ENV variable set but not empty" do
      before { allow(ENV).to receive(:[]).with("SWAP_EXPIRY_HOURS").and_return("6")}
      specify { expect(helper.swap_validity_hours).to eq(6.0)  }
    end
  end
end

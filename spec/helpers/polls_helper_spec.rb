require "rails_helper"

RSpec.describe PollsHelper, type: :helper do
  include Devise::Test::ControllerHelpers

  describe "#poll_data_for" do
    let(:constituency) { OnsConstituency.new(id: 1) }

    specify { expect { helper.poll_data_for(constituency) }.not_to raise_error }
  end
end

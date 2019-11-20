require 'rails_helper'

RSpec.describe PollsHelper, type: :helper do

  describe '#poll_data_for' do
    let(:constituency) { Constituency.new(id: 1) }

    specify { expect { helper.poll_data_for(constituency) }.not_to raise_error }
  end

end

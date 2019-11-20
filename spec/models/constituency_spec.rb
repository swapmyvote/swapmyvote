require 'rails_helper'

RSpec.describe Constituency, type: :model do
  subject { described_class.new(id: 1)}

  describe '#polls' do
    specify { expect {subject.polls}.not_to raise_error }
  end

end

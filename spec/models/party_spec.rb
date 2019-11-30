require "rails_helper"

RSpec.describe Party, type: :model do
  it { is_expected.to respond_to :color }
  it { is_expected.to respond_to :name }

  it { is_expected.to respond_to :polls }
end

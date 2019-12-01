RSpec.shared_context "swapping closed" do
  before do
    ENV["SWAPS_CLOSED"] = "true"
  end

  after do
    ENV.delete "SWAPS_CLOSED"
  end
end

RSpec.configure do |rspec|
  rspec.include_context "swapping closed", swapping: :closed
end

RSpec.shared_context "swapping closed" do
  before do
    allow(ENV)
      .to receive(:[]).with("SWAPMYVOTE_MODE").and_return("closed-warm-up")
  end
end

RSpec.configure do |rspec|
  rspec.include_context "swapping closed", swapping: :closed
end

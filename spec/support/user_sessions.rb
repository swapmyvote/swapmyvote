RSpec.shared_context "user logged in" do
  let(:user) { create(:user) }

  before do
    sign_in user
  end
end

RSpec.configure do |rspec|
  rspec.include_context "user logged in", logged_in: true
end

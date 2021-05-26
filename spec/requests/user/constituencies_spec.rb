require "rails_helper"

RSpec.describe "User::Constituencies", type: :request do
  context "when configured for swaps" do
    before do
      allow(ENV).to receive(:[]).with("SWAPMYVOTE_MODE").and_return("open")
    end

    # TODO: get request spec working as it appears to be the standard for rails 5+
    # Maybe to fake being logged in we have to go through the login steps

    context "and user is logged in" do
      before do
        pending
        # expect(subject).to receive(:logged_in?).and_return(true)
        # session[:user_id] = :some_user_id
      end

      describe "GET /user/constituencies/edit" do
        it "works! (now write some real specs)" do
          # get edit_user_constituency_path
          put "/user/constituency"
          expect(response).to have_http_status(200)
        end
      end
    end
  end
end

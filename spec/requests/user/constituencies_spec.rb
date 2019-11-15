require 'rails_helper'

RSpec.describe "User::Constituencies", type: :request do
  describe "GET /user/constituencies/edit" do
    it "works! (now write some real specs)" do
      get edit_user_constituency_path
      expect(response).to have_http_status(200)
    end
  end
end

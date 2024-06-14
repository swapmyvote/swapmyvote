require "rails_helper"

ENV["ADMIN_PASSWORD"] = "test_password"

RSpec.describe AdminController, type: :controller do
  let(:mock_current_user) do
    create(:ready_to_swap_user1, id: 111, constituency: build(:ons_constituency))
  end

  let(:mock_mailer_return) do
    double(:mock_mailer_return, deliver_now: true)
  end

  it "sends email proofs" do
    allow(controller).to receive(:current_user).and_return(mock_current_user)
    # allow(subject).to receive(:http_basic_authenticate_with)

    allow(controller).to receive(:authenticate_or_request_with_http_basic).with(anything, anything).and_return true

    expect(UserMailer).to receive(:welcome_email).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:confirm_swap).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:email_address_shared).and_return(mock_mailer_return)

    expect(UserMailer).to receive(:swap_confirmed).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:swap_confirmed).and_return(mock_mailer_return)

    expect(UserMailer).to receive(:swap_cancelled).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:not_swapped_follow_up).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:partner_has_voted).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:reminder_to_vote).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:no_swap).and_return(mock_mailer_return)
    expect(UserMailer).to receive(:swap_not_confirmed).and_return(mock_mailer_return)

    get :send_email_proofs

    expect(flash[:errors]).not_to be_present
  end
end

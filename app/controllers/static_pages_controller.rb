class StaticPagesController < ApplicationController
  FORWARD_DEMOCRACY_PRIVACY_POLICY_URL = "https://forwarddemocracy.com/privacy-policy".freeze

  def faq
  end

  def privacy
    redirect_to FORWARD_DEMOCRACY_PRIVACY_POLICY_URL,
                status: :moved_permanently,
                allow_other_host: true
  end

  def cookies
  end

  def terms
  end

  def about
  end

  def contact
  end

  def api
    @parties = Party.order(:name).all
  end

  def confirm_account_deletion
  end

  def account_deleted
  end
end

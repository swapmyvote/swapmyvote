class StaticPagesController < ApplicationController
  def faq
  end

  def privacy
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

class HomeController < ApplicationController
  def index
    if logged_in?
      redirect_to user_path
      return
    end
    @parties = Party.all
  end
end

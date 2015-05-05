class HomeController < ApplicationController
  def index
    if logged_in? and swapping_open?
      redirect_to user_path
      return
    end
    @parties = Party.all
  end
end

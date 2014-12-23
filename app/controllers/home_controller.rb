class HomeController < ApplicationController
  def index
    @parties = Party.all
  end
end

class User::ShareController < ApplicationController
  before_action :require_swapping_open
  before_action :require_login

  def show
  end
end

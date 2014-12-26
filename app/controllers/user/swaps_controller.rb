class User::SwapsController < ApplicationController
  before_action :require_login
  
  def show
  end
  
  def new
    @swap_with = User.find(params[:user_id])
  end
end

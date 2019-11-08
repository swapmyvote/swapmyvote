# frozen_string_literal: true

class AdminController < ApplicationController
  http_basic_authenticate_with name: "swapmyvote", password: ENV["ADMIN_PASSWORD"]

  def stats
    @user_count = User.count
    @swap_count = Swap.count
    @confirmed_swap_count = Swap.where(confirmed: true).count
    @parties = Party.all
    @swaps_matrix = []
    @parties.each do |preferred_party|
      row = []
      @swaps_matrix.push row
      @parties.each do |willing_party|
        count = User.where(willing_party: willing_party, preferred_party: preferred_party).count
        row.push count
      end
    end
  end
end

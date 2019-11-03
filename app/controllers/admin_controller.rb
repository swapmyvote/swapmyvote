class AdminController < ApplicationController
  http_basic_authenticate_with name: "swapmyvote", password: ENV["ADMIN_PASSWORD"]

  def stats
    @user_count = User.count
    @swap_count = Swap.count
    @confirmed_swap_count = Swap.where(confirmed: true).count
    @parties = Party.all
    @swaps_matrix = []
    for preferred_party in @parties
      row = []
      @swaps_matrix.push row
      for willing_party in @parties
        count = User.where(willing_party: willing_party, preferred_party: preferred_party).count
        row.push count
      end
    end
  end
end

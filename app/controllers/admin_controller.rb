class AdminController < ApplicationController
  if ENV["ADMIN_PASSWORD"].blank?
    raise "You didn't set ADMIN_PASSWORD!"
  end

  http_basic_authenticate_with name: "swapmyvote",
                               password: ENV["ADMIN_PASSWORD"] || "secret"

  def stats
    @user_count = User.count
    @swap_count = Swap.count
    @unconfirmed_swap_count = Swap.where(confirmed: false).count
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

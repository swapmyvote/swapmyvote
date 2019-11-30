module SwapsHelper
  def swap_validity_hours
    env_expiry_hours = ENV["SWAP_EXPIRY_HOURS"]
    return env_expiry_hours.blank? ? 48 : env_expiry_hours.to_f
  end
end

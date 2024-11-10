class Party < ApplicationRecord
  has_many :polls, dependent: :destroy
  has_many :recommended_parties,
           inverse_of: :party,
           dependent: :destroy

  def standing_in(ons_id)
    if smv_code.to_sym == :plaid
      return ons_id[0] == "W"
    end
    if smv_code.to_sym == :snp
      return ons_id[0] == "S"
    end
    return true
  end

  def short_name
    short = smv_code && smv_code.size == 3 ? smv_code.titleize : nil
    short ||= (smv_code || name).downcase.gsub(/[aeiou]/, "")[0..2].titleize
    short
  end

  class << self
    def master_list(reference_data)
      reference_data.map do |(smv_code, attributes)|
        attributes.merge(
          canonical_name: attributes[:name].parameterize(separator: "_").to_sym,
          smv_code: smv_code
        )
      end
    end
  end
end

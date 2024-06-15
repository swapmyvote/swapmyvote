class Party < ApplicationRecord
  has_many :polls, dependent: :destroy
  has_many :recommended_parties,
           inverse_of: :party,
           dependent: :destroy

  REFERENCE_DATA = {
    lab: { name: "Labour", color: "#DC241f", ge_default: true },
    libdem: { name: "Liberal Democrats", color: "#FFB602", ge_default: true },
    green: { name: "Green", color: "#6AB023", ge_default: true },
    con: { name: "Conservatives", color: "#0087DC", ge_default: true },
    ukip: { name: "UKIP", color: "#70147A" },
    snp: { name: "SNP", color: "#FFF95D", ge_default: true },
    plaid: { name: "Plaid Cymru", color: "#008142", ge_default: true },
    brexit: { name: "Brexit", color: "#5bc0de" },
    breakthrough: { name: "Breakthrough" },
    for_britain: { name: "For Britain" },
    freedom_alliance: { name: "Freedom Alliance" },
    independent: { name: "Independent" },
    reform: { name: "Reform", color: "#5bc0de", ge_default: true },
    rejoin_eu: { name: "Rejoin eu" },
    workers: { name: "Workers" },
    yorkshire: { name: "Yorkshire" },
  }

  def standing_in(ons_id)
    if smv_code.to_sym == :plaid
      return ons_id[0] == "W"
    end
    if smv_code.to_sym == :snp
      return ons_id[0] == "S"
    end
    return true
  end

  class << self
    def canonical_names
      master_list.map { |p| p[:canonical_name].to_s }
    end

    def smv_codes
      master_list.map { |p| p[:smv_code].to_s }
    end

    def names
      master_list.pluck(:name)
    end

    def master_list
      REFERENCE_DATA.map do |(smv_code, attributes)|
        attributes.merge(
          canonical_name: attributes[:name].parameterize(separator: "_").to_sym,
          smv_code: smv_code
        )
      end
    end
  end
end

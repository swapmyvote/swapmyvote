class Party < ApplicationRecord
  has_many :polls, dependent: :destroy

  REFERENCE_DATA = {
    lab: { name: "Labour", color: "#DC241f" },
    libdem: { name: "Liberal Democrats", color: "#FFB602" },
    green: { name: "Green", color: "#6AB023" },
    con: { name: "Conservatives", color: "#0087DC" },
    ukip: { name: "UKIP", color: "#70147A" },
    snp: { name: "SNP", color: "#FFF95D" },
    plaid: { name: "Plaid Cymru", color: "#008142" },
    brexit: { name: "Brexit", color: "#5bc0de" },
    breakthrough: { name: " Breakthrough" },
    for_britain: { name: "For Britain" },
    freedom_alliance: { name: "Freedom Alliance" },
    independent: { name: "Independent" },
    reform: { name: "Reform" },
    rejoin_eu: { name: "Rejoin eu" },
    workers: { name: "Workers" },
    yorkshire: { name: "Yorkshire" },

  }

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

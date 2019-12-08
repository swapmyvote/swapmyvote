class Party < ApplicationRecord
  has_many :polls

  REFERENCE_DATA = {
    lab: { name: "Labour", color: "#DC241f" },
    libdem: { name: "Liberal Democrats", color: "#FFB602" },
    green: { name: "Green Party", color: "#6AB023" },
    con: { name: "Conservatives", color: "#0087DC" },
    ukip: { name: "UKIP", color: "#70147A" },
    snp: { name: "SNP", color: "#FFF95D" },
    plaid: { name: "Plaid Cymru", color: "#008142" },
    brexit: { name: "Brexit Party", color: "#5bc0de" }
  }

  class << self
    def canonical_names
      master_list.map { |p| p[:canonical_name].to_s }
    end

    def short_codes
      master_list.map { |p| p[:short_code].to_s }
    end

    def names
      master_list.map { |p| p[:name] }
    end

    def master_list
      REFERENCE_DATA.map do |(short_code, attributes)|
        attributes.merge(
          canonical_name: attributes[:name].parameterize(separator: "_").to_sym,
          short_code: short_code
      )
      end
    end
  end
end

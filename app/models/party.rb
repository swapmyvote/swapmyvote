class Party < ApplicationRecord
  has_many :polls

  RAW_MASTER_LIST = [
    { name: "Labour", color: "#DC241f", short_code: :lab },
    { name: "Liberal Democrats", color: "#FFB602", short_code: :libdem },
    { name: "Green Party", color: "#6AB023", short_code: :green },
    { name: "Conservatives", color: "#0087DC", short_code: :con },
    { name: "UKIP", color: "#70147A", short_code: :ukip },
    { name: "SNP", color: "#FFF95D", short_code: :snp },
    { name: "Plaid Cymru", color: "#008142", short_code: :plaid },
    { name: "Brexit Party", color: "#5bc0de", short_code: :brexit }
  ]

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
      RAW_MASTER_LIST.map do |p|
        p.merge(canonical_name: p[:name].parameterize(separator: "_").to_sym)
      end
    end
  end
end

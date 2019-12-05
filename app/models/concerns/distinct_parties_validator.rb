class DistinctPartiesValidator < ActiveModel::Validator
  def validate(record)
    if !record.preferred_party_id.nil? && !record.willing_party_id.nil? && 
        record.preferred_party_id == record.willing_party_id
      record.errors.add(:preferred_party, 'and willing party cannot be the same')
    end
  end
end
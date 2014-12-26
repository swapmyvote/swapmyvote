parties = Party.all

for constituency in Constituency.all
  for party in parties
    Poll.create party: party, constituency: constituency, votes: rand(2000)
  end
end

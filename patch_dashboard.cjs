const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const replacement = `  // Prepare chart data
  const chartDataMap: Record<string, any> = {};
  if (wardTotals.length > 0) {
    wardTotals.forEach(row => {
      if (!chartDataMap[row.wardName]) {
        chartDataMap[row.wardName] = { name: row.wardName };
      }
      chartDataMap[row.wardName][row.partyAbbr] = Number(row.totalVotes);
    });
  }
  const chartData = Object.values(chartDataMap);

  // Get Top 5 Parties by overall votes for the chart
  const sortedParties = [...candidateTotals]
    .sort((a, b) => Number(b.totalVotes || 0) - Number(a.totalVotes || 0))
    .map(c => c.partyAbbr)
    .slice(0, 5);

  const colors = ["#1e40af", "#dc2626", "#15803d", "#d97706", "#7e22ce"];
`;

code = code.replace(
  /  \/\/ Prepare chart data[\s\S]*?const chartData = Object\.values\(chartDataMap\);/,
  replacement
);

const barReplacement = `                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {sortedParties.map((partyAbbr, idx) => (
                  <Bar key={partyAbbr} dataKey={partyAbbr} fill={colors[idx % colors.length]} radius={[6, 6, 0, 0]} maxBarSize={60} />
                ))}
              </BarChart>`;

code = code.replace(
  /                <Legend wrapperStyle=\{\{ paddingTop: '20px' \}\} \/>[\s\S]*?              <\/BarChart>/,
  barReplacement
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);

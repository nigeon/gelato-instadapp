async function getGasCostForFullRefinance(route) {
  switch (route) {
    case 0:
      return 2519000; // 2290000 * 1,1
    case 1:
      return 3140500; // 2855000 * 1,1
    case 2:
      return 3971000; // 3610000 * 1,1
    case 3:
      return 4345000; // 3950000 * 1,1
    default:
      break;
  }
}

module.exports = getGasCostForFullRefinance;

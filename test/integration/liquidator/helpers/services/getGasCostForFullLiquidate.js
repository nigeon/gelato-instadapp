module.exports = async function (route) {
  switch (route) {
    case 0:
      return 2519000; // 2290000 * 1,1 // gas left method measure : 2290000 - 2106637 = 183363 | gas reporter : 2290000 - 1789126 = 500874
    case 1:
      return 3140500; // 2855000 * 1,1 // gas left method measure : 2855000 - 2667325 = 187675 | gas reporter : 2855000 - 2244814 = 610186
    case 2:
      return 3971000; // 3610000 * 1,1 // gas left method measure : 3610000 - 3423279 = 186721 | gas reporter : 3610000 - 3031103 = 578897
    case 3:
      return 4345000; // 3950000 * 1,1 // gas left method measure : 3950000 - 3764004 = 185996 | gas reporter : 3950000 - 3313916 = 636084
    default:
      break;
  }
};

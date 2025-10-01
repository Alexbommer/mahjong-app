import React, { useState } from "react";
import {
  ChakraProvider,
  Box,
  Button,
  Text,
  Input,
  Select,
  Radio,
  RadioGroup,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
} from "@chakra-ui/react";

export default function App() {
  // ---------------- State ----------------
  const [screen, setScreen] = useState("start");
  const [playerNames, setPlayerNames] = useState(["", "", "", ""]);
  const [seatOrder, setSeatOrder] = useState([0, 1, 2, 3]);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [roundWind, setRoundWind] = useState("east");
  const [quan, setQuan] = useState(1);
  const [bankerTurnCount, setBankerTurnCount] = useState(0);

  const [winner, setWinner] = useState("");
  const [loser, setLoser] = useState("");
  const [settlementType, setSettlementType] = useState("discard");

  const [hand, setHand] = useState([]);
  const [flowerCount, setFlowerCount] = useState("0");

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const winds = ["east", "south", "west", "north"];
  const windNames = {
    east: "東風圈",
    south: "南風圈",
    west: "西風圈",
    north: "北風圈",
  };
  const seatNames = { east: "東", south: "南", west: "西", north: "北" };

  const allTiles = [
    ...Array.from({ length: 9 }, (_, i) => ({ suit: "dot", value: i + 1 })),
    ...Array.from({ length: 9 }, (_, i) => ({ suit: "bamboo", value: i + 1 })),
    ...Array.from({ length: 9 }, (_, i) => ({
      suit: "character",
      value: i + 1,
    })),
    { suit: "wind", value: "east" },
    { suit: "wind", value: "south" },
    { suit: "wind", value: "west" },
    { suit: "wind", value: "north" },
    { suit: "dragon", value: "red" },
    { suit: "dragon", value: "green" },
    { suit: "dragon", value: "white" },
  ];

  function tileImage(tile) {
    if (["dot", "bamboo", "character"].includes(tile.suit)) {
      return `/tiles/${tile.suit}-${tile.value}.png`;
    }
    return `/tiles/${tile.value}.png`;
  }

  function addTile(tile) {
    if (hand.length < 14) setHand([...hand, tile]);
  }

  function removeTile(index) {
    const newHand = [...hand];
    newHand.splice(index, 1);
    setHand(newHand);
  }

  // ---------------- Hand Validators ----------------
  function canFormStandardHand(hand) {
    const tiles = hand.map((t) => `${t.suit}-${t.value}`).sort();
    const counts = {};
    tiles.forEach((k) => (counts[k] = (counts[k] || 0) + 1));

    for (let key of Object.keys(counts)) {
      if (counts[key] >= 2) {
        const newCounts = { ...counts };
        newCounts[key] -= 2;
        if (canFormMelds(newCounts)) return true;
      }
    }
    return false;
  }

  function canFormMelds(counts) {
    const keys = Object.keys(counts).filter((k) => counts[k] > 0);
    if (keys.length === 0) return true;

    const key = keys[0];
    const [suit, valueStr] = key.split("-");
    const value = parseInt(valueStr, 10);

    if (counts[key] >= 3) {
      const newCounts = { ...counts, [key]: counts[key] - 3 };
      if (canFormMelds(newCounts)) return true;
    }

    if (["dot", "bamboo", "character"].includes(suit)) {
      const k2 = `${suit}-${value + 1}`;
      const k3 = `${suit}-${value + 2}`;
      if (counts[k2] > 0 && counts[k3] > 0) {
        const newCounts = { ...counts };
        newCounts[key]--;
        newCounts[k2]--;
        newCounts[k3]--;
        if (canFormMelds(newCounts)) return true;
      }
    }
    return false;
  }

  // ---------------- Scoring Engine ----------------
  function calculateFanDetailed(hand) {
    if (hand.length !== 14) return null;
    const counts = {};
    for (const t of hand) {
      const key = `${t.suit}-${t.value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    if (
      !isThirteenOrphans(hand) &&
      !isSevenPairs(counts) &&
      !canFormStandardHand(hand)
    ) {
      return null;
    }

    let fan = 1;
    let name = "平胡";

    if (isThirteenOrphans(hand)) return { baseFan: 10, name: "十三幺" };
    if (isNineGates(hand)) return { baseFan: 10, name: "九蓮寶燈" };
    if (isBigFourWinds(counts)) return { baseFan: 10, name: "大四喜" };
    if (isAllHonors(counts)) return { baseFan: 10, name: "字一色" };
    if (isAllTerminals(counts)) return { baseFan: 10, name: "清老頭" };

    if (isSevenPairs(counts)) {
      fan = Math.max(fan, 2);
      name = "七對";
    }
    if (isAllTriplets(counts)) {
      fan = Math.max(fan, 3);
      name = "碰碰胡";
    }

    const suits = hand
      .filter((t) => ["dot", "bamboo", "character"].includes(t.suit))
      .map((t) => t.suit);
    const hasHonors = hand.some(
      (t) => t.suit === "wind" || t.suit === "dragon"
    );

    if (suits.length > 0 && new Set(suits).size === 1) {
      if (hasHonors) {
        fan = Math.max(fan, 3);
        name = "混一色";
      } else {
        fan = Math.max(fan, 6);
        name = "清一色";
      }
    }

    const dragonCount = ["dragon-red", "dragon-green", "dragon-white"].filter(
      (d) => counts[d] >= 3
    ).length;
    if (dragonCount === 2) {
      fan = Math.max(fan, 2);
      name = "小三元";
    }
    if (dragonCount === 3) {
      fan = Math.max(fan, 6);
      name = "大三元";
    }

    const windCount = [
      "wind-east",
      "wind-south",
      "wind-west",
      "wind-north",
    ].filter((w) => counts[w] >= 3).length;
    if (windCount === 3) {
      fan = Math.max(fan, 6);
      name = "小四喜";
    }
    if (windCount === 4) return { baseFan: 10, name: "大四喜" };

    return { baseFan: Math.min(fan, 10), name };
  }

  function isSevenPairs(counts) {
    return Object.values(counts).filter((c) => c === 2).length === 7;
  }
  function isAllTriplets(counts) {
    return Object.values(counts).filter((c) => c >= 3).length >= 4;
  }
  function isAllHonors(counts) {
    return Object.keys(counts).every(
      (k) => k.startsWith("wind") || k.startsWith("dragon")
    );
  }
  function isAllTerminals(counts) {
    return Object.keys(counts).every(
      (k) => k.includes("-1") || k.includes("-9")
    );
  }
  function isBigFourWinds(counts) {
    return ["wind-east", "wind-south", "wind-west", "wind-north"].every(
      (w) => counts[w] >= 3
    );
  }
  function isThirteenOrphans(hand) {
    const needed = [
      "dot-1",
      "dot-9",
      "bamboo-1",
      "bamboo-9",
      "character-1",
      "character-9",
      "wind-east",
      "wind-south",
      "wind-west",
      "wind-north",
      "dragon-red",
      "dragon-green",
      "dragon-white",
    ];
    const keys = new Set(hand.map((t) => `${t.suit}-${t.value}`));
    return needed.every((t) => keys.has(t));
  }
  function isNineGates(hand) {
    const suits = hand
      .filter((t) => ["dot", "bamboo", "character"].includes(t.suit))
      .map((t) => t.suit);
    if (new Set(suits).size !== 1) return false;
    const counts = {};
    for (const t of hand) {
      counts[t.value] = (counts[t.value] || 0) + 1;
    }
    return counts[1] >= 3 && counts[9] >= 3 && Object.keys(counts).length === 9;
  }

  // ---------------- Bonus Calculations ----------------
  function flowerBonus(count) {
    let bonus = count;
    if (count === 4) bonus += 2;
    if (count === 8) bonus += 4;
    return bonus;
  }
  function windBonuses(hand, seat, round) {
    const counts = {};
    for (const t of hand) {
      const key = `${t.suit}-${t.value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    let bonus = 0;
    if (counts[`wind-${seat}`] >= 3) bonus += 1;
    if (counts[`wind-${round}`] >= 3) bonus += 1;
    return bonus;
  }

  function calculateBreakdown(hand) {
    const result = calculateFanDetailed(hand);
    if (!result) return null;
    let total = result.baseFan;
    const parts = [`${result.name} ${result.baseFan}番`];

    // --- Kong Bonus
    const kongCount = Object.values(
      hand.reduce((acc, t) => {
        const key = `${t.suit}-${t.value}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).filter((c) => c === 4).length;
    if (kongCount > 0) {
      parts.push(`+ ${kongCount}番 槓子`);
      total += kongCount;
    }

    // --- Flower / 無花
    if (flowerCount === "none") {
      parts.push(`+ 1番 無花`);
      total += 1;
    } else {
      const fBonus = flowerBonus(parseInt(flowerCount));
      if (fBonus > 0) {
        parts.push(`+ ${fBonus}番 靚花`);
        total += fBonus;
      }
    }

    // --- Self draw
    if (settlementType === "selfdraw") {
      parts.push(`+ 1番 自摸`);
      total += 1;
    }

    // --- Wind Bonus
    const winIdx = parseInt(winner || -1, 10);
    if (winIdx >= 0) {
      const winnerSeatWind = ["east", "south", "west", "north"][
        seatOrder.indexOf(winIdx)
      ];
      const windBonus = windBonuses(hand, winnerSeatWind, roundWind);
      if (windBonus > 0) {
        parts.push(`+ ${windBonus}番 風牌`);
        total += windBonus;
      }
    }

    parts.push(`= ${total}番`);
    return { breakdown: parts.join(" "), total };
  }
  const breakdownResult = calculateBreakdown(hand);

  // ---------------- Settlement Flow ----------------
  function bankerWins() {}
  function bankerLoses() {
    setSeatOrder((prev) => [prev[1], prev[2], prev[3], prev[0]]);
    setBankerTurnCount((count) => {
      if (count === 3) {
        setRoundWind((prevWind) => {
          const i = winds.indexOf(prevWind);
          if (i === winds.length - 1) {
            setQuan((q) => q + 1);
            return "east";
          } else return winds[i + 1];
        });
        return 0;
      }
      return count + 1;
    });
  }

  function applySettlement() {
    if (winner === "") {
      alert("請選擇勝家");
      return;
    }
    if (!breakdownResult) {
      alert("請選擇14張牌來計算番數");
      return;
    }

    const winIdx = parseInt(winner, 10);
    let newScores = [...scores];

    if (settlementType === "discard") {
      if (loser === "") {
        alert("請選擇出銃玩家");
        return;
      }
      const loseIdx = parseInt(loser, 10);
      newScores[winIdx] += breakdownResult.total;
      newScores[loseIdx] -= breakdownResult.total;
    } else if (settlementType === "selfdraw") {
      for (let i = 0; i < 4; i++) {
        if (i !== winIdx) {
          newScores[i] -= breakdownResult.total;
          newScores[winIdx] += breakdownResult.total;
        }
      }
    }

    setScores(newScores);
    if (seatOrder[0] === winIdx) bankerWins();
    else bankerLoses();

    setHistory((prev) => [
      ...prev,
      {
        round: `${quan}圈 ${windNames[roundWind]}`,
        winner: playerNames[winIdx] || `玩家${winIdx + 1}`,
        loser:
          settlementType === "discard"
            ? playerNames[parseInt(loser, 10)] ||
              `玩家${parseInt(loser, 10) + 1}`
            : "—",
        type: settlementType === "discard" ? "出銃" : "自摸",
        fan: breakdownResult.total,
        scores: [...newScores],
      },
    ]);

    setWinner("");
    setLoser("");
    setSettlementType("discard");
    setHand([]);
    setFlowerCount("0");
  }

  function resetGame() {
    if (window.confirm("確定要重新開始嗎？")) {
      setScreen("seats");
      setPlayerNames(["", "", "", ""]);
      setSeatOrder([0, 1, 2, 3]);
      setScores([0, 0, 0, 0]);
      setRoundWind("east");
      setQuan(1);
      setBankerTurnCount(0);
      setWinner("");
      setLoser("");
      setSettlementType("discard");
      setHand([]);
      setFlowerCount("0");
      setHistory([]);
    }
  }

  // ---------------- Screens ----------------
  return (
    <ChakraProvider>
      <Box bg="yellow.100" minH="100vh" p={6}>
        {screen === "start" && (
          <Box textAlign="center" mt="20">
            <Button
              size="lg"
              colorScheme="yellow"
              onClick={() => setScreen("seats")}
            >
              開臺啦
            </Button>
          </Box>
        )}

        {screen === "seats" && (
          <Box maxW="400px" mx="auto" textAlign="center">
            <Text fontSize="xl" mb={4}>
              輸入玩家名字
            </Text>
            <Stack spacing={3}>
              {playerNames.map((name, i) => (
                <Input
                  key={i}
                  placeholder={`玩家 ${i + 1}`}
                  value={name}
                  onChange={(e) => {
                    const updated = [...playerNames];
                    updated[i] = e.target.value;
                    setPlayerNames(updated);
                  }}
                />
              ))}
            </Stack>
            <Button
              mt={4}
              colorScheme="yellow"
              onClick={() => setScreen("game")}
            >
              確認
            </Button>
          </Box>
        )}

        {screen === "game" && (
          <Box>
            <Text fontSize="2xl" fontWeight="bold">
              第 {quan} 圈 - {windNames[roundWind]}
            </Text>

            <Box mt={4}>
              {["east", "south", "west", "north"].map((seat, i) => {
                const playerIndex = seatOrder[i];
                return (
                  <Text key={seat}>
                    {seatNames[seat]}:{" "}
                    {playerNames[playerIndex] || `玩家${playerIndex + 1}`}　
                    分數: {scores[playerIndex]}{" "}
                    {i === 0 && (
                      <span style={{ color: "#b8860b", fontWeight: "bold" }}>
                        ← 莊家
                      </span>
                    )}
                  </Text>
                );
              })}
            </Box>

            <Divider my={4} />

            {/* Settlement Form */}
            <Box>
              <Text fontWeight="bold">勝家:</Text>
              <Select
                placeholder="-- 選擇 --"
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                maxW="200px"
                mt={2}
              >
                {seatOrder.map((idx) => (
                  <option key={idx} value={idx}>
                    {playerNames[idx] || `玩家${idx + 1}`}
                  </option>
                ))}
              </Select>

              {settlementType === "discard" && (
                <Box mt={4}>
                  <Text fontWeight="bold">出銃:</Text>
                  <Select
                    placeholder="-- 選擇 --"
                    value={loser}
                    onChange={(e) => setLoser(e.target.value)}
                    maxW="200px"
                    mt={2}
                  >
                    {seatOrder.map((idx) => (
                      <option key={idx} value={idx}>
                        {playerNames[idx] || `玩家${idx + 1}`}
                      </option>
                    ))}
                  </Select>
                </Box>
              )}

              <Box mt={4}>
                <RadioGroup
                  value={settlementType}
                  onChange={setSettlementType}
                >
                  <Stack direction="row">
                    <Radio value="discard">出銃</Radio>
                    <Radio value="selfdraw">自摸</Radio>
                  </Stack>
                </RadioGroup>
              </Box>

              <Box mt={4}>
                <Text fontWeight="bold">有無靚花?</Text>
                <Select
                  value={flowerCount}
                  onChange={(e) => setFlowerCount(e.target.value)}
                  maxW="200px"
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="8">8</option>
                  <option value="none">無花</option>
                </Select>
              </Box>

              {/* Tile Picker */}
              <Box mt={6}>
                <Text fontWeight="bold">選擇和牌 (14張)</Text>
                <Box display="flex" flexWrap="wrap" gap="6px" mt={2}>
                  {allTiles.map((tile, i) => (
                    <img
                      key={i}
                      src={tileImage(tile)}
                      alt={`${tile.suit}-${tile.value}`}
                      onClick={() => addTile(tile)}
                      style={{
                        width: "40px",
                        height: "55px",
                        cursor: "pointer",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                      }}
                    />
                  ))}
                </Box>
                <Box
                  mt={3}
                  display="flex"
                  flexWrap="wrap"
                  gap="6px"
                >
                  {hand.map((tile, i) => (
                    <img
                      key={i}
                      src={tileImage(tile)}
                      alt={`${tile.suit}-${tile.value}`}
                      onClick={() => removeTile(i)}
                      style={{
                        width: "40px",
                        height: "55px",
                        cursor: "pointer",
                        border: "2px solid red",
                        borderRadius: "4px",
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Breakdown */}
              {breakdownResult && (
                <Box mt={4} fontWeight="bold">
                  {breakdownResult.breakdown}
                </Box>
              )}

              <Stack direction="row" mt={6} spacing={4}>
                <Button colorScheme="yellow" onClick={applySettlement}>
                  確認結算
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={() => setShowHistory(true)}
                >
                  歷史紀錄
                </Button>
                <Button colorScheme="red" onClick={resetGame}>
                  再來一局
                </Button>
              </Stack>

              {/* History Table */}
              {showHistory && (
                <Box mt={6}>
                  <Text fontSize="xl" fontWeight="bold">
                    歷史紀錄
                  </Text>
                  <Table mt={2} variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>回合</Th>
                        <Th>勝家</Th>
                        <Th>出銃</Th>
                        <Th>類型</Th>
                        <Th>番數</Th>
                        <Th>分數</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {history.map((h, idx) => (
                        <Tr key={idx}>
                          <Td>{h.round}</Td>
                          <Td>{h.winner}</Td>
                          <Td>{h.loser}</Td>
                          <Td>{h.type}</Td>
                          <Td>{h.fan}</Td>
                          <Td>{h.scores.join(", ")}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ChakraProvider>
  );
}

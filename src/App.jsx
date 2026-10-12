import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// GitHub リポジトリ情報
const OWNER = "ishikawa111111-ui";
const REPO = "YGCeditor";
const FILE_PATH = "gacha_csv.csv";

const GITHUB_CONTENTS_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

const rarityColor = {
  N: "#d0d0d0",
  R: "#4da6ff",
  SR: "#b366ff",
  SSR: "linear-gradient(90deg, #ffdd44, #ffcc00)",
};

const styles = {
  container: {
    padding: "20px",
    background: "#222",
    color: "#fff",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  button: {
    background: "linear-gradient(90deg, #ffdd44, #ffcc00)",
    border: "2px solid #000",
    padding: "8px 16px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  addButton: {
    background: "#4da6ff",
    border: "2px solid #000",
    padding: "8px 16px",
    marginRight: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  tokenInput: {
    marginTop: "10px",
    padding: "8px",
    width: "300px",
  },
  table: {
    marginTop: "20px",
    width: "100%",
    borderCollapse: "collapse",
    background: "#333",
  },
  th: {
    border: "1px solid #555",
    padding: "8px",
    background: "#444",
  },
  td: {
    border: "1px solid #555",
    padding: "8px",
  },
  ratePanel: {
    background: "#333",
    padding: "10px",
    marginTop: "20px",
    border: "2px solid #555",
  },
};

function App() {
  const [rows, setRows] = useState([]);
  const [sha, setSha] = useState("");
  const [token, setToken] = useState("");

  // ★ GitHub から CSV を読み込む
  useEffect(() => {
    fetch(GITHUB_CONTENTS_URL)
      .then((res) => res.json())
      .then((data) => {
        const csvText = atob(data.content);

        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            const cleaned = result.data.map((cols) => ({
              name_jp: cols[0] || "",
              name_en: cols[1] || "",
              rarity: cols[2] || "N",
              attack: Number(cols[3] || 10),
              defense: Number(cols[4] || 10),
            }));
            setRows(cleaned);
            setSha(data.sha);
          },
        });
      })
      .catch((err) => console.error("GitHub CSV 読み込み失敗:", err));
  }, []);

  // ローカル CSV 読み込み
  const handleUpload = (e) => {
    const file = e.target.files[0];

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        const cleaned = result.data.map((cols) => ({
          name_jp: cols[0] || "",
          name_en: cols[1] || "",
          rarity: cols[2] || "N",
          attack: Number(cols[3] || 10),
          defense: Number(cols[4] || 10),
        }));

        setRows(cleaned);
      },
    });
  };

  const handleChange = (index, key, value) => {
    const newRows = [...rows];

    if (key === "attack" || key === "defense") {
      const num = Number(value);
      if (num < 1) value = 1;
      if (num > 999) value = 999;
    }

    newRows[index][key] = value;
    setRows(newRows);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { name_jp: "", name_en: "", rarity: "N", attack: 10, defense: 10 },
    ]);
  };

  const deleteRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  // ★ GitHub に保存
  const saveToGitHub = () => {
    if (!token) {
      alert("GitHub Token を入力してください");
      return;
    }

    const csv = Papa.unparse(rows);
    const base64 = btoa(csv);

    fetch(GITHUB_CONTENTS_URL, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "update gacha_csv.csv",
        content: base64,
        sha: sha,
        branch: "main",
      }),
    })
      .then((res) => {
        if (res.ok) {
          alert("GitHub に保存しました！");
        } else {
          alert("保存失敗（Token または権限を確認）");
        }
      })
      .catch((err) => alert("通信エラー: " + err));
  };

  // ★ CSV をローカルにダウンロード
  const exportCSV = () => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "gacha_csv.csv";
    a.click();
  };

  // 排出率計算
  const rarityStats = useMemo(() => {
    const total = rows.length || 1;

    const count = {
      SSR: rows.filter((r) => r.rarity === "SSR").length,
      SR: rows.filter((r) => r.rarity === "SR").length,
      R: rows.filter((r) => r.rarity === "R").length,
      N: rows.filter((r) => r.rarity === "N").length,
    };

    return {
      count,
      rate: {
        SSR: ((count.SSR / total) * 100).toFixed(2),
        SR: ((count.SR / total) * 100).toFixed(2),
        R: ((count.R / total) * 100).toFixed(2),
        N: ((count.N / total) * 100).toFixed(2),
      },
    };
  }, [rows]);

  // 並び替え
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newRows = [...rows];
    const [removed] = newRows.splice(result.source.index, 1);
    newRows.splice(result.destination.index, 0, removed);

    setRows(newRows);
  };

  return (
    <div style={styles.container}>
      <h2>YGCeditor（GitHub連携版）</h2>

      <input
        type="password"
        placeholder="GitHub Token を入力"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        style={styles.tokenInput}
      />

      <button style={styles.button} onClick={saveToGitHub}>
        GitHub に保存
      </button>

      <button style={styles.button} onClick={exportCSV}>
        CSV をダウンロード
      </button>

      <button style={styles.addButton} onClick={addRow}>
        行を追加
      </button>

      <input type="file" accept=".csv" onChange={handleUpload} />

      <div style={styles.ratePanel}>
        <h3>排出率（自動計算）</h3>
        <p>SSR: {rarityStats.rate.SSR}%（{rarityStats.count.SSR}体）</p>
        <p>SR: {rarityStats.rate.SR}%（{rarityStats.count.SR}体）</p>
        <p>R: {rarityStats.rate.R}%（{rarityStats.count.R}体）</p>
        <p>N: {rarityStats.rate.N}%（{rarityStats.count.N}体）</p>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="table">
          {(provided) => (
            <table
              style={styles.table}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <thead>
                <tr>
                  <th style={styles.th}>name_jp</th>
                  <th style={styles.th}>name_en</th>
                  <th style={styles.th}>rarity</th>
                  <th style={styles.th}>attack</th>
                  <th style={styles.th}>defense</th>
                  <th style={styles.th}>削除</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => (
                  <Draggable
                    key={index}
                    draggableId={String(index)}
                    index={index}
                  >
                    {(provided) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          background:
                            row.rarity === "SSR"
                              ? rarityColor.SSR
                              : rarityColor[row.rarity],
                          color: row.rarity === "SSR" ? "#000" : "#fff",
                          fontWeight: "bold",
                          ...provided.draggableProps.style,
                        }}
                      >
                        <td style={styles.td}>
                          <input
                            value={row.name_jp}
                            onChange={(e) =>
                              handleChange(index, "name_jp", e.target.value)
                            }
                          />
                        </td>

                        <td style={styles.td}>
                          <input
                            value={row.name_en}
                            onChange={(e) =>
                              handleChange(index, "name_en", e.target.value)
                            }
                          />
                        </td>

                        <td style={styles.td}>
                          <select
                            value={row.rarity}
                            style={{
                              background:
                                row.rarity === "SSR"
                                  ? rarityColor.SSR
                                  : rarityColor[row.rarity],
                              color: row.rarity === "SSR" ? "#000" : "#fff",
                              fontWeight: "bold",
                              border: "2px solid #000",
                              padding: "4px",
                            }}
                            onChange={(e) =>
                              handleChange(index, "rarity", e.target.value)
                            }
                          >
                            <option value="N">N</option>
                            <option value="R">R</option>
                            <option value="SR">SR</option>
                            <option value="SSR">SSR</option>
                          </select>
                        </td>

                        <td style={styles.td}>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={row.attack}
                            onChange={(e) =>
                              handleChange(index, "attack", e.target.value)
                            }
                          />
                        </td>

                        <td style={styles.td}>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={row.defense}
                            onChange={(e) =>
                              handleChange(index, "defense", e.target.value)
                            }
                          />
                        </td>

                        <td style={styles.td}>
                          <button
                            style={{
                              background: "#ff4444",
                              border: "2px solid #000",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                            onClick={() => deleteRow(index)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </table>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default App;

// deploy test
/* ============================================================
   QUẢN LÝ LỚP HỌC
   Google Sheet ID:
   1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU

   CẤU TRÚC SHEET

   LOP:
   A = Malop
   B = TenLop
   C = GVCN
   D = Namhoc

   Các sheet dữ liệu:
   HOCSINH
   DIEM
   THIDUA
   DIEMDANH

   ============================================================ */


/* ============================================================
   1. CẤU HÌNH
   ============================================================ */

const SHEET_ID =
  "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU";

const SHEETS = {
  LOP: "LOP",
  HOCSINH: "HOCSINH",
  DIEM: "DIEM",
  THIDUA: "THIDUA",
  DIEMDANH: "DIEMDANH"
};


/* ============================================================
   2. BIẾN DỮ LIỆU
   ============================================================ */

let allClasses = [];
let allStudents = [];
let allScores = [];
let allCompetition = [];
let allAttendance = [];

let selectedClass = "";


/* ============================================================
   3. HÀM LẤY DỮ LIỆU GOOGLE SHEET
   ============================================================ */

async function fetchSheet(sheetName) {

  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  console.log("Đang tải sheet:", sheetName);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Không thể tải sheet ${sheetName}. HTTP ${response.status}`
    );
  }

  const text = await response.text();

  /*
     Google trả về dạng:

     /*O_o*/
     google.visualization.Query.setResponse({...});

     Ta lấy phần JSON bên trong.
  */

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error(
      `Dữ liệu sheet ${sheetName} không đúng định dạng.`
    );
  }

  const jsonText = text.substring(start, end + 1);

  const data = JSON.parse(jsonText);

  if (
    !data.table ||
    !data.table.cols ||
    !data.table.rows
  ) {
    throw new Error(
      `Không đọc được dữ liệu sheet ${sheetName}.`
    );
  }

  return convertGoogleTable(data.table);
}


/* ============================================================
   4. CHUYỂN GOOGLE TABLE → ARRAY OBJECT
   ============================================================ */

function convertGoogleTable(table) {

  const headers = table.cols.map((col, index) => {

    let label = col.label;

    if (!label || label.trim() === "") {
      label = `Column${index + 1}`;
    }

    return normalizeHeader(label);
  });


  const rows = table.rows.map(row => {

    const obj = {};

    headers.forEach((header, index) => {

      const cell =
        row.c && row.c[index]
          ? row.c[index]
          : null;

      obj[header] =
        cell && cell.v !== null && cell.v !== undefined
          ? cell.v
          : "";

    });

    return obj;
  });


  return rows;
}


/* ============================================================
   5. CHUẨN HÓA TÊN CỘT
   ============================================================ */

function normalizeHeader(value) {

  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
}


/* ============================================================
   6. HÀM TÌM GIÁ TRỊ TRONG OBJECT
   Cho phép nhiều cách đặt tên cột.
   ============================================================ */

function getValue(obj, names) {

  if (!obj) return "";

  for (const name of names) {

    const key = normalizeHeader(name);

    if (
      Object.prototype.hasOwnProperty.call(obj, key) &&
      obj[key] !== null &&
      obj[key] !== undefined &&
      String(obj[key]).trim() !== ""
    ) {
      return obj[key];
    }
  }

  return "";
}


/* ============================================================
   7. KHỞI ĐỘNG
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  initApp
);


async function initApp() {

  console.log("=================================");
  console.log("KHỞI ĐỘNG ỨNG DỤNG");
  console.log("=================================");

  setCurrentDate();

  try {

    await loadAllData();

  } catch (error) {

    console.error(error);

    showError(
      "Không thể tải dữ liệu Google Sheet: " +
      error.message
    );

  }
}


/* ============================================================
   8. TẢI TOÀN BỘ DỮ LIỆU
   ============================================================ */

async function loadAllData() {

  hideError();

  console.log("Đang tải toàn bộ dữ liệu...");


  try {

    /*
       Tải song song 5 sheet
    */

    const [
      lop,
      hocSinh,
      diem,
      thiDua,
      diemDanh
    ] = await Promise.all([

      fetchSheet(SHEETS.LOP),

      fetchSheet(SHEETS.HOCSINH),

      fetchSheet(SHEETS.DIEM),

      fetchSheet(SHEETS.THIDUA),

      fetchSheet(SHEETS.DIEMDANH)

    ]);


    allClasses = lop;
    allStudents = hocSinh;
    allScores = diem;
    allCompetition = thiDua;
    allAttendance = diemDanh;


    console.log("Dữ liệu LOP:", allClasses);
    console.log("Dữ liệu HOCSINH:", allStudents);
    console.log("Dữ liệu DIEM:", allScores);
    console.log("Dữ liệu THIDUA:", allCompetition);
    console.log("Dữ liệu DIEMDANH:", allAttendance);


    /*
       QUAN TRỌNG:
       Lấy Malop từ cột A của sheet LOP.
    */

    buildClassSelect();


    /*
       Nếu trước đó đã chọn lớp
       và lớp đó vẫn tồn tại → giữ nguyên.
    */

    const currentExists =
      allClasses.some(
        row =>
          getValue(row, ["Malop"]) === selectedClass
      );


    if (!currentExists) {

      if (allClasses.length > 0) {

        selectedClass =
          getValue(allClasses[0], ["Malop"]);

      } else {

        selectedClass = "";

      }

    }


    const select =
      document.getElementById("classSelect");

    if (select) {
      select.value = selectedClass;
    }


    updateTeacherInfo();

    renderEverything();


    console.log("=================================");
    console.log("ĐÃ TẢI XONG TOÀN BỘ DỮ LIỆU");
    console.log("Số lớp:", allClasses.length);
    console.log("Số học sinh:", allStudents.length);
    console.log("=================================");


  } catch (error) {

    console.error(
      "LỖI TẢI DỮ LIỆU:",
      error
    );

    showError(
      "Lỗi tải dữ liệu: " +
      error.message
    );

  }
}


/* ============================================================
   9. TẠO DANH SÁCH LỚP
   ============================================================ */

function buildClassSelect() {

  const select =
    document.getElementById("classSelect");

  if (!select) return;


  select.innerHTML = "";


  /*
     Nếu không có lớp
  */

  if (!allClasses.length) {

    const option =
      document.createElement("option");

    option.value = "";

    option.textContent =
      "Không có lớp";

    select.appendChild(option);

    return;
  }


  /*
     Tạo từng lớp
  */

  allClasses.forEach(row => {

    /*
       ĐÂY LÀ ĐIỂM QUAN TRỌNG NHẤT.

       Sheet LOP của bạn:

       A = Malop
       B = TenLop
       C = GVCN
       D = Namhoc

       Vì vậy value = Malop.
    */

    const maLop =
      String(
        getValue(row, ["Malop"])
      ).trim();


    const tenLop =
      String(
        getValue(row, ["TenLop"])
      ).trim();


    if (!maLop) {

      console.warn(
        "Bỏ qua dòng LOP không có Malop:",
        row
      );

      return;
    }


    const option =
      document.createElement("option");


    option.value = maLop;


    /*
       Hiển thị:
       Lớp 6A1

       nếu TenLop có dữ liệu.

       Nếu không có thì hiển thị:
       6A1
    */

    option.textContent =
      tenLop || maLop;


    select.appendChild(option);


    console.log(
      "Đã thêm lớp:",
      maLop,
      tenLop
    );

  });


  /*
     Khi người dùng đổi lớp
  */

  select.onchange = function () {

    selectedClass =
      this.value;

    console.log(
      "Đã chọn lớp:",
      selectedClass
    );

    updateTeacherInfo();

    renderEverything();

  };

}


/* ============================================================
   10. THÔNG TIN GVCN
   ============================================================ */

function updateTeacherInfo() {

  const classRow =
    allClasses.find(
      row =>
        getValue(row, ["Malop"]) ===
        selectedClass
    );


  if (!classRow) {

    setText(
      "teacherClass",
      "Lớp —"
    );

    return;
  }


  const tenLop =
    getValue(
      classRow,
      ["TenLop"]
    );


  const gvcn =
    getValue(
      classRow,
      ["GVCN"]
    );


  setText(
    "teacherClass",
    tenLop || selectedClass
  );


  /*
     Nếu có GVCN thì đổi lời chào
  */

  if (gvcn) {

    const welcome =
      document.getElementById(
        "welcomeText"
      );

    if (welcome) {

      welcome.textContent =
        `Chào ${gvcn}!`;

    }

  }

}


/* ============================================================
   11. RENDER TOÀN BỘ
   ============================================================ */

function renderEverything() {

  renderStudents();

  renderScores();

  renderCompetition();

  renderAttendance();

  updateStatistics();

}


/* ============================================================
   12. LỌC HỌC SINH THEO LỚP
   ============================================================ */

function getStudentsOfSelectedClass() {

  if (!selectedClass) {
    return [];
  }


  return allStudents.filter(
    student => {

      const maLop =
        String(
          getValue(
            student,
            [
              "Malop",
              "MaLop",
              "Lop",
              "TenLop"
            ]
          )
        ).trim();


      return maLop === selectedClass;

    }
  );

}


/* ============================================================
   13. LỌC ĐIỂM THEO LỚP
   ============================================================ */

function getScoresOfSelectedClass() {

  if (!selectedClass) {
    return [];
  }


  const students =
    getStudentsOfSelectedClass();


  const studentIds =
    new Set(
      students.map(
        student =>
          String(
            getValue(
              student,
              [
                "MaHS",
                "Mahs",
                "ID",
                "StudentID"
              ]
            )
          ).trim()
      )
    );


  /*
     Trường hợp sheet DIEM có Malop
  */

  const hasClassColumn =
    allScores.some(
      row =>
        getValue(
          row,
          ["Malop"]
        ) !== ""
    );


  if (hasClassColumn) {

    return allScores.filter(
      row =>
        String(
          getValue(
            row,
            ["Malop"]
          )
        ).trim() === selectedClass
    );

  }


  /*
     Nếu DIEM không có Malop,
     lọc bằng MaHS.
  */

  return allScores.filter(
    row => {

      const maHS =
        String(
          getValue(
            row,
            [
              "MaHS",
              "Mahs",
              "ID",
              "StudentID"
            ]
          )
        ).trim();

      return studentIds.has(maHS);

    }
  );

}


/* ============================================================
   14. RENDER HỌC SINH
   ============================================================ */

function renderStudents() {

  const tbody =
    document.getElementById(
      "studentsTable"
    );

  if (!tbody) return;


  const students =
    getStudentsOfSelectedClass();


  setText(
    "studentCountLabel",
    `${students.length} học sinh`
  );


  setText(
    "totalStudents",
    students.length
  );


  setText(
    "statClassName",
    selectedClass
      ? `Lớp ${selectedClass}`
      : "Lớp —"
  );


  if (!students.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Không tìm thấy học sinh của lớp ${selectedClass || ""}
        </td>
      </tr>
    `;

    return;
  }


  tbody.innerHTML =
    students.map(
      (student, index) => {

        const maHS =
          getValue(
            student,
            [
              "MaHS",
              "Mahs",
              "ID",
              "StudentID"
            ]
          );


        const hoTen =
          getValue(
            student,
            [
              "HoTen",
              "Hoten",
              "HoVaTen",
              "Hovaten",
              "Ten"
            ]
          );


        const ngaySinh =
          getValue(
            student,
            [
              "NgaySinh",
              "Ngaysinh",
              "BirthDate"
            ]
          );


        const gioiTinh =
          getValue(
            student,
            [
              "GioiTinh",
              "Gioitinh",
              "Gender"
            ]
          );


        const ghiChu =
          getValue(
            student,
            [
              "GhiChu",
              "Ghichu",
              "Note"
            ]
          );


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHTML(maHS)}
            </td>

            <td>
              <strong>
                ${escapeHTML(hoTen)}
              </strong>
            </td>

            <td>
              ${formatDate(ngaySinh)}
            </td>

            <td>
              ${escapeHTML(gioiTinh)}
            </td>

            <td>
              ${escapeHTML(ghiChu || "—")}
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* ============================================================
   15. TÌM HỌC SINH THEO MÃ
   ============================================================ */

function findStudent(maHS) {

  const id =
    String(maHS)
      .trim()
      .toLowerCase();


  return allStudents.find(
    student => {

      const studentId =
        String(
          getValue(
            student,
            [
              "MaHS",
              "Mahs",
              "ID",
              "StudentID"
            ]
          )
        )
        .trim()
        .toLowerCase();


      return studentId === id;

    }
  );

}


/* ============================================================
   16. TÍNH ĐIỂM TRUNG BÌNH
   ============================================================ */

function calculateAverage(row) {

  const columns = [
    "TX1",
    "TX2",
    "TX3",
    "TX4"
  ];


  const values = [];


  columns.forEach(
    column => {

      const value =
        parseFloat(
          getValue(
            row,
            [column]
          )
        );


      if (
        !isNaN(value) &&
        value >= 0
      ) {

        values.push(value);

      }

    }
  );


  if (!values.length) {
    return null;
  }


  const sum =
    values.reduce(
      (a, b) => a + b,
      0
    );


  return sum / values.length;

}


/* ============================================================
   17. RENDER ĐIỂM
   ============================================================ */

function renderScores() {

  const tbody =
    document.getElementById(
      "scoresTable"
    );

  if (!tbody) return;


  const students =
    getStudentsOfSelectedClass();


  const scoreRows =
    getScoresOfSelectedClass();


  if (!students.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          Chưa có học sinh.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    students.map(
      (student, index) => {

        const maHS =
          String(
            getValue(
              student,
              [
                "MaHS",
                "Mahs",
                "ID",
                "StudentID"
              ]
            )
          ).trim();


        const hoTen =
          getValue(
            student,
            [
              "HoTen",
              "Hoten",
              "HoVaTen",
              "Hovaten",
              "Ten"
            ]
          );


        /*
           Tìm dòng điểm của học sinh.
        */

        const score =
          scoreRows.find(
            row => {

              const id =
                String(
                  getValue(
                    row,
                    [
                      "MaHS",
                      "Mahs",
                      "ID",
                      "StudentID"
                    ]
                  )
                ).trim();

              return id === maHS;

            }
          );


        const tx1 =
          score
            ? getValue(score, ["TX1"])
            : "";


        const tx2 =
          score
            ? getValue(score, ["TX2"])
            : "";


        const tx3 =
          score
            ? getValue(score, ["TX3"])
            : "";


        const tx4 =
          score
            ? getValue(score, ["TX4"])
            : "";


        const avg =
          score
            ? calculateAverage(score)
            : null;


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHTML(maHS)}
            </td>

            <td>
              ${escapeHTML(hoTen)}
            </td>

            <td>
              ${displayNumber(tx1)}
            </td>

            <td>
              ${displayNumber(tx2)}
            </td>

            <td>
              ${displayNumber(tx3)}
            </td>

            <td>
              ${displayNumber(tx4)}
            </td>

            <td>
              <strong>
                ${
                  avg === null
                    ? "—"
                    : avg.toFixed(2)
                }
              </strong>
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* ============================================================
   18. RENDER THI ĐUA
   ============================================================ */

function renderCompetition() {

  const tbody =
    document.getElementById(
      "competitionTable"
    );

  if (!tbody) return;


  let rows =
    allCompetition.filter(
      row => {

        const maLop =
          getValue(
            row,
            [
              "Malop",
              "Lop"
            ]
          );


        return (
          !maLop ||
          String(maLop).trim() ===
          selectedClass
        );

      }
    );


  if (!rows.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Chưa có dữ liệu thi đua.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    rows.map(
      (row, index) => {

        const maHS =
          getValue(
            row,
            [
              "MaHS",
              "Mahs"
            ]
          );


        const ngay =
          getValue(
            row,
            [
              "Ngay",
              "NgayThiDua",
              "Date"
            ]
          );


        const lop =
          getValue(
            row,
            [
              "Malop",
              "Lop"
            ]
          ) ||
          selectedClass;


        const noiDung =
          getValue(
            row,
            [
              "NoiDung",
              "Noidung",
              "Content"
            ]
          );


        const diem =
          getValue(
            row,
            [
              "Diem",
              "DiemThiDua",
              "Score"
            ]
          );


        return `
          <tr>

            <td>${index + 1}</td>

            <td>${escapeHTML(maHS)}</td>

            <td>${formatDate(ngay)}</td>

            <td>${escapeHTML(lop)}</td>

            <td>${escapeHTML(noiDung)}</td>

            <td>
              <strong>
                ${displayNumber(diem)}
              </strong>
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* ============================================================
   19. RENDER ĐIỂM DANH
   ============================================================ */

function renderAttendance() {

  const tbody =
    document.getElementById(
      "attendanceTable"
    );

  if (!tbody) return;


  const students =
    getStudentsOfSelectedClass();


  if (!students.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty">
          Chưa có học sinh.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    students.map(
      (student, index) => {

        const maHS =
          String(
            getValue(
              student,
              [
                "MaHS",
                "Mahs"
              ]
            )
          ).trim();


        const hoTen =
          getValue(
            student,
            [
              "HoTen",
              "Hoten",
              "HoVaTen"
            ]
          );


        /*
           Lấy điểm danh mới nhất
           của học sinh.
        */

        const records =
          allAttendance.filter(
            row => {

              const id =
                String(
                  getValue(
                    row,
                    [
                      "MaHS",
                      "Mahs"
                    ]
                  )
                ).trim();

              return id === maHS;

            }
          );


        let record = null;


        if (records.length) {

          record =
            records[records.length - 1];

        }


        const status =
          record
            ? getValue(
                record,
                [
                  "TrangThai",
                  "Trangthai",
                  "Status"
                ]
              )
            : "Chưa xác định";


        const ngay =
          record
            ? getValue(
                record,
                [
                  "Ngay",
                  "NgayDiemDanh",
                  "Date"
                ]
              )
            : "";


        const ghiChu =
          record
            ? getValue(
                record,
                [
                  "GhiChu",
                  "Ghichu",
                  "Note"
                ]
              )
            : "";


        return `
          <tr>

            <td>
              ${index + 1}
            </td>

            <td>
              ${escapeHTML(maHS)}
            </td>

            <td>
              ${escapeHTML(hoTen)}
            </td>

            <td>
              ${attendanceStatusHTML(status)}
            </td>

            <td>
              ${formatDate(ngay)}
            </td>

            <td>
              ${escapeHTML(ghiChu || "—")}
            </td>

          </tr>
        `;

      }
    ).join("");

}


/* ============================================================
   20. TRẠNG THÁI ĐIỂM DANH
   ============================================================ */

function attendanceStatusHTML(status) {

  const s =
    String(status)
      .trim()
      .toLowerCase();


  if (
    s.includes("có mặt") ||
    s.includes("co mat") ||
    s === "present"
  ) {

    return `
      <span class="status status-present">
        Có mặt
      </span>
    `;

  }


  if (
    s.includes("vắng") ||
    s.includes("vang") ||
    s === "absent"
  ) {

    return `
      <span class="status status-absent">
        Vắng
      </span>
    `;

  }


  if (
    s.includes("muộn") ||
    s.includes("muon") ||
    s === "late"
  ) {

    return `
      <span class="status status-late">
        Đi muộn
      </span>
    `;

  }


  return `
    <span class="status">
      ${escapeHTML(status || "Chưa xác định")}
    </span>
  `;

}


/* ============================================================
   21. THỐNG KÊ
   ============================================================ */

function updateStatistics() {

  const students =
    getStudentsOfSelectedClass();


  const scoreRows =
    getScoresOfSelectedClass();


  /*
     ============================
     TÍNH ĐIỂM TRUNG BÌNH
     ============================
  */

  const averages = [];


  scoreRows.forEach(
    row => {

      const avg =
        calculateAverage(row);

      if (avg !== null) {

        averages.push(avg);

      }

    }
  );


  if (averages.length) {

    const total =
      averages.reduce(
        (a, b) => a + b,
        0
      );


    const average =
      total / averages.length;


    setText(
      "averageScore",
      average.toFixed(1)
    );

  } else {

    setText(
      "averageScore",
      "—"
    );

  }


  /*
     ============================
     TỶ LỆ ĐIỂM >= 8
     ============================
  */

  const goodStudents =
    averages.filter(
      score => score >= 8
    ).length;


  const goodPercent =
    averages.length
      ? Math.round(
          goodStudents /
          averages.length *
          100
        )
      : 0;


  setText(
    "goodPercent",
    `${goodPercent}%`
  );


  /*
     ============================
     PHÂN LOẠI
     ============================
  */

  let excellent = 0;
  let good = 0;
  let average = 0;
  let needHelp = 0;


  averages.forEach(
    score => {

      if (score >= 9) {

        excellent++;

      } else if (score >= 8) {

        good++;

      } else if (score >= 6.5) {

        average++;

      } else {

        needHelp++;

      }

    }
  );


  setText(
    "excellentCount",
    excellent
  );

  setText(
    "goodCount",
    good
  );

  setText(
    "averageCount",
    average
  );

  setText(
    "needHelpCount",
    needHelp
  );


  const total =
    averages.length || 1;


  setWidth(
    "excellentBar",
    excellent / total * 100
  );

  setWidth(
    "goodBar",
    good / total * 100
  );

  setWidth(
    "averageBar",
    average / total * 100
  );

  setWidth(
    "needHelpBar",
    needHelp / total * 100
  );


  /*
     ============================
     HỌC SINH CẦN CHÚ Ý
     ============================
  */

  renderAttention(
    students,
    scoreRows
  );

}


/* ============================================================
   22. HỌC SINH CẦN CHÚ Ý
   ============================================================ */

function renderAttention(
  students,
  scoreRows
) {

  const container =
    document.getElementById(
      "attentionList"
    );

  if (!container) return;


  const attention = [];


  students.forEach(
    student => {

      const maHS =
        String(
          getValue(
            student,
            [
              "MaHS",
              "Mahs"
            ]
          )
        ).trim();


      const hoTen =
        getValue(
          student,
          [
            "HoTen",
            "Hoten",
            "HoVaTen"
          ]
        );


      const score =
        scoreRows.find(
          row =>
            String(
              getValue(
                row,
                [
                  "MaHS",
                  "Mahs"
                ]
              )
            ).trim() === maHS
        );


      const avg =
        score
          ? calculateAverage(score)
          : null;


      if (
        avg !== null &&
        avg < 6.5
      ) {

        attention.push({
          maHS,
          hoTen,
          avg
        });

      }

    }
  );


  if (!attention.length) {

    container.innerHTML =
      `
        <div class="empty">
          🎉 Chưa có học sinh cần chú ý.
        </div>
      `;

    return;

  }


  container.innerHTML =
    attention.map(
      student => `
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          background:#f7f9fd;
          border-radius:14px;
          padding:13px;
          margin-bottom:10px;
        ">

          <div>

            <strong>
              ${escapeHTML(student.hoTen)}
            </strong>

            <div style="
              color:#8a96ad;
              font-size:12px;
              margin-top:4px;
            ">
              ${escapeHTML(student.maHS)}
            </div>

          </div>

          <div style="
            background:#fff0db;
            color:#c47616;
            font-weight:800;
            padding:7px 10px;
            border-radius:10px;
          ">
            ${student.avg.toFixed(1)}
          </div>

        </div>
      `
    ).join("");

}


/* ============================================================
   23. NGÀY HIỆN TẠI
   ============================================================ */

function setCurrentDate() {

  const element =
    document.getElementById(
      "currentDate"
    );


  if (!element) return;


  const date =
    new Date();


  const days = [
    "Chủ nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy"
  ];


  const text =
    `${days[date.getDay()]}, ` +
    `${String(date.getDate()).padStart(2,"0")}/` +
    `${String(date.getMonth()+1).padStart(2,"0")}/` +
    `${date.getFullYear()}`;


  element.textContent = text;

}


/* ============================================================
   24. FORMAT DATE
   ============================================================ */

function formatDate(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {

    return "—";

  }


  const text =
    String(value).trim();


  /*
     Nếu Google trả dạng:
     Date(2014,2,12)
  */

  const match =
    text.match(
      /Date\((\d+),(\d+),(\d+)\)/
    );


  if (match) {

    const year =
      Number(match[1]);

    const month =
      Number(match[2]) + 1;

    const day =
      Number(match[3]);


    return `
      ${String(day).padStart(2,"0")}/
      ${String(month).padStart(2,"0")}/
      ${year}
    `.replace(/\s/g,"");

  }


  /*
     Nếu đã là ngày bình thường
  */

  return escapeHTML(text);

}


/* ============================================================
   25. HIỂN THỊ SỐ
   ============================================================ */

function displayNumber(value) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {

    return "—";

  }


  const number =
    Number(value);


  if (!isNaN(number)) {

    return number
      .toString();

  }


  return escapeHTML(value);

}


/* ============================================================
   26. SET TEXT
   ============================================================ */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;

  }

}


/* ============================================================
   27. SET WIDTH
   ============================================================ */

function setWidth(
  id,
  percent
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.style.width =
      `${Math.max(
        0,
        Math.min(
          100,
          percent
        )
      )}%`;

  }

}


/* ============================================================
   28. ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

  return String(
    value ?? ""
  )
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );

}


/* ============================================================
   29. THÔNG BÁO LỖI
   ============================================================ */

function showError(message) {

  const box =
    document.getElementById(
      "errorBox"
    );


  if (!box) return;


  box.textContent =
    message;


  box.style.display =
    "block";

}


function hideError() {

  const box =
    document.getElementById(
      "errorBox"
    );


  if (!box) return;


  box.style.display =
    "none";

}


/* ============================================================
   30. CUỘN ĐẾN DANH SÁCH
   ============================================================ */

function scrollToStudents() {

  const element =
    document.getElementById(
      "studentsPanel"
    );


  if (element) {

    element.scrollIntoView({
      behavior: "smooth"
    });

  }

}


/* ============================================================
   31. CUỘN ĐẾN ĐIỂM
   ============================================================ */

function scrollToScores() {

  const element =
    document.getElementById(
      "scoresPanel"
    );


  if (element) {

    element.scrollIntoView({
      behavior: "smooth"
    });

  }

}


/* ============================================================
   32. KẾT THÚC
   ============================================================ */

console.log(
  "app.js đã được nạp thành công."
);

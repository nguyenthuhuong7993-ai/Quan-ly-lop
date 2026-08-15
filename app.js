/* =========================================================
   TRỢ LÝ AI – QUẢN LÝ LỚP HỌC
   app.js – bản hoàn chỉnh
   ========================================================= */

"use strict";

const CONFIG = {
  SPREADSHEET_ID: "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU",

  SHEETS: {
    CLASSES: "LOP",
    STUDENTS: "HOCSINH",
    SCORES: "DIEM",
    COMPETITION: "THIDUA",
    ATTENDANCE: "DIEMDANH"
  },

  // Để trống nếu chưa có Google Apps Script.
  APPS_SCRIPT_URL: "",

  LATE_TIME: "07:00"
};


// =========================================================
// 1. BIẾN DỮ LIỆU
// =========================================================

let classes = [];
let students = [];
let scores = [];
let competitions = [];
let attendances = [];

let selectedClassId = "";
let selectedDate = "";
let selectedStudentId = "";

let videoStream = null;


// =========================================================
// 2. TIỆN ÍCH
// =========================================================

function log(...args) {
  console.log("[APP]", ...args);
}


function showStatus(message, type = "info") {

  const el = document.getElementById("statusBox");

  if (!el) return;

  el.textContent = message;

  el.className = "status show";

  if (type === "error") {
    el.classList.add("error");
  }

  if (type === "success") {
    el.classList.add("success");
  }
}


function clearStatus() {

  const el = document.getElementById("statusBox");

  if (el) {
    el.className = "status";
  }
}


function todayISO() {

  const d = new Date();

  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}


function normalizeText(value) {

  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_\-.]/g, "");
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function numberOrZero(value) {

  const n = Number(
    String(value ?? "").replace(",", ".")
  );

  return Number.isFinite(n) ? n : 0;
}


// =========================================================
// 3. XỬ LÝ NGÀY
// =========================================================

function normalizeDate(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const text = String(value).trim();


  // Google Visualization:
  // Date(2026,7,15)

  const googleDate =
    text.match(
      /^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/
    );

  if (googleDate) {

    return (
      googleDate[1] +
      "-" +
      String(
        Number(googleDate[2]) + 1
      ).padStart(2, "0") +
      "-" +
      String(
        googleDate[3]
      ).padStart(2, "0")
    );
  }


  // YYYY-MM-DD

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(text)
  ) {
    return text;
  }


  // DD/MM/YYYY hoặc DD-MM-YYYY

  const match =
    text.match(
      /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
    );

  if (match) {

    return (
      match[3] +
      "-" +
      String(match[2]).padStart(2, "0") +
      "-" +
      String(match[1]).padStart(2, "0")
    );
  }


  return text;
}


function formatDate(value) {

  const iso = normalizeDate(value);

  const match =
    iso.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return String(value ?? "");
  }

  return (
    match[3] +
    "/" +
    match[2] +
    "/" +
    match[1]
  );
}


// =========================================================
// 4. TỰ ĐỘNG NHẬN DIỆN TÊN CỘT
// =========================================================

function getField(
  row,
  aliases,
  fallback = ""
) {

  if (!row) {
    return fallback;
  }

  const keys =
    Object.keys(row);


  for (const alias of aliases) {

    const target =
      normalizeText(alias);


    const key =
      keys.find(
        k =>
          normalizeText(k) === target
      );


    if (
      key !== undefined &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ""
    ) {

      return row[key];
    }
  }


  return fallback;
}


// =========================================================
// 5. CÁC CỘT HỌC SINH
// =========================================================

function getStudentId(row) {

  return String(
    getField(
      row,
      [
        "MaHS",
        "Mã HS",
        "Mã học sinh",
        "ID",
        "StudentID"
      ]
    )
  );
}


function getStudentName(row) {

  return String(
    getField(
      row,
      [
        "HoTen",
        "Họ tên",
        "Họ và tên",
        "Tên học sinh",
        "TenHS"
      ],
      "Chưa có tên"
    )
  );
}


function getStudentClass(row) {

  return String(
    getField(
      row,
      [
        "MaLop",
        "Mã lớp",
        "Malop",
        "Lớp",
        "Lop",
        "TenLop",
        "Tên lớp"
      ]
    )
  );
}


function getGender(row) {

  return String(
    getField(
      row,
      [
        "Gioitinh",
        "Giới tính",
        "Gioi tinh",
        "GT"
      ]
    )
  );
}


function getBirthday(row) {

  return getField(
    row,
    [
      "NgaySinh",
      "Ngày sinh",
      "Ngay sinh",
      "NS"
    ],
    ""
  );
}


// =========================================================
// 6. CÁC CỘT LỚP
// =========================================================

function getClassId(row) {

  return String(
    getField(
      row,
      [
        "Malop",
        "MaLop",
        "Mã lớp",
        "MãLớp",
        "LopID",
        "ID"
      ],
      ""
    )
  );
}


function getClassName(row) {

  return String(
    getField(
      row,
      [
        "TenLop",
        "Tên lớp",
        "Tên lớp học",
        "Lop",
        "Lớp"
      ],
      getClassId(row) ||
      "Lớp chưa đặt tên"
    )
  );
}


function getTeacher(row) {

  return String(
    getField(
      row,
      [
        "GVCN",
        "GVCN lớp",
        "Giáo viên chủ nhiệm",
        "Giáo viên CN",
        "ChuNhiem",
        "Chủ nhiệm"
      ],
      ""
    )
  );
}


// =========================================================
// 7. CỘT ĐIỂM DANH
// =========================================================

function getAttendanceStudentId(row) {

  return String(
    getField(
      row,
      [
        "MaHS",
        "Mã HS",
        "Mã học sinh",
        "StudentID",
        "ID_HS"
      ],
      ""
    )
  );
}


function getAttendanceDate(row) {

  return getField(
    row,
    [
      "Ngay",
      "Ngày",
      "NgayDiemDanh",
      "Ngày điểm danh",
      "Date",
      "DateTime"
    ],
    ""
  );
}


function getAttendanceStatus(row) {

  return String(
    getField(
      row,
      [
        "TrangThai",
        "Trạng thái",
        "Status",
        "DiemDanh",
        "Điểm danh"
      ],
      "Chưa xác định"
    )
  );
}


function getAttendanceNote(row) {

  return String(
    getField(
      row,
      [
        "GhiChu",
        "Ghi chú",
        "Note",
        "LyDo",
        "Lý do"
      ],
      ""
    )
  );
}


// =========================================================
// 8. ĐỌC GOOGLE SHEETS
// =========================================================

function parseGoogleVisualizationResponse(text) {

  const start =
    text.indexOf("{");

  const end =
    text.lastIndexOf("}");


  if (
    start < 0 ||
    end < 0
  ) {

    throw new Error(
      "Google Sheets không trả về JSON hợp lệ."
    );
  }


  const data =
    JSON.parse(
      text.slice(
        start,
        end + 1
      )
    );


  if (
    data.status === "error"
  ) {

    const message =
      (data.errors || [])
        .map(
          e =>
            e.detailed_message ||
            e.message
        )
        .join("; ");


    throw new Error(
      message ||
      "Google Sheets trả về lỗi."
    );
  }


  return data;
}


async function fetchSheet(sheetName) {

  const url =
    "https://docs.google.com/spreadsheets/d/" +
    CONFIG.SPREADSHEET_ID +
    "/gviz/tq?tqx=out:json&sheet=" +
    encodeURIComponent(sheetName);


  log(
    "Đang đọc Sheet:",
    sheetName
  );


  const response =
    await fetch(
      url,
      {
        method: "GET",
        cache: "no-store"
      }
    );


  if (!response.ok) {

    throw new Error(
      `Sheet ${sheetName}: HTTP ${response.status}`
    );
  }


  const data =
    parseGoogleVisualizationResponse(
      await response.text()
    );


  const columns =
    (
      data.table?.cols || []
    ).map(
      c =>
        c.label ||
        c.id ||
        ""
    );


  const rows =
    (
      data.table?.rows || []
    ).map(
      row => {

        const object = {};


        columns.forEach(
          (
            columnName,
            index
          ) => {

            if (!columnName) {
              return;
            }


            const cell =
              row.c?.[index];


            object[columnName] =
              cell?.v ??
              cell?.f ??
              "";
          }
        );


        return object;
      }
    );


  log(
    `Đã đọc ${sheetName}:`,
    rows.length,
    "dòng"
  );


  if (rows[0]) {

    console.log(
      `CỘT CỦA SHEET ${sheetName}:`,
      Object.keys(rows[0])
    );
  }


  return rows;
}


// =========================================================
// 9. TẢI TOÀN BỘ DỮ LIỆU
// =========================================================

async function loadAllData() {

  showStatus(
    "⏳ Đang tải dữ liệu từ Google Sheets..."
  );


  try {

    const result =
      await Promise.all(
        [
          fetchSheet(
            CONFIG.SHEETS.CLASSES
          ),

          fetchSheet(
            CONFIG.SHEETS.STUDENTS
          ),

          fetchSheet(
            CONFIG.SHEETS.SCORES
          ),

          fetchSheet(
            CONFIG.SHEETS.COMPETITION
          ),

          fetchSheet(
            CONFIG.SHEETS.ATTENDANCE
          )
        ]
      );


    classes =
      result[0];

    students =
      result[1];

    scores =
      result[2];

    competitions =
      result[3];

    attendances =
      result[4];


    console.log(
      "Dữ liệu lớp:",
      classes
    );

    console.log(
      "Dữ liệu học sinh:",
      students
    );

    console.log(
      "Dữ liệu điểm:",
      scores
    );

    console.log(
      "Dữ liệu thi đua:",
      competitions
    );

    console.log(
      "Dữ liệu điểm danh:",
      attendances
    );


    console.log(
      "Số lớp:",
      classes.length
    );

    console.log(
      "Số học sinh:",
      students.length
    );


    renderClassSelect();

    renderAll();


    showStatus(
      `✅ Đã tải xong: ${classes.length} lớp, ${students.length} học sinh.`,
      "success"
    );


    setTimeout(
      clearStatus,
      3500
    );

  } catch (error) {

    console.error(error);


    showStatus(
      "❌ Lỗi tải dữ liệu: " +
      error.message,
      "error"
    );
  }
}


// =========================================================
// 10. XỬ LÝ LỚP
// =========================================================

function classKey(row) {

  return (
    getClassId(row) ||
    getClassName(row)
  );
}


function getSelectedClass() {

  return classes.find(
    row =>
      classKey(row) ===
      String(selectedClassId)
  ) || null;
}


function renderClassSelect() {

  const select =
    document.getElementById(
      "classSelect"
    );


  if (!select) {
    return;
  }


  select.innerHTML = "";


  if (!classes.length) {

    select.innerHTML =
      '<option value="">Không có lớp</option>';

    selectedClassId = "";

    return;
  }


  classes.forEach(
    (
      row,
      index
    ) => {

      const id =
        classKey(row) ||
        `class-${index}`;


      const name =
        getClassName(row);


      const teacher =
        getTeacher(row);


      const option =
        document.createElement(
          "option"
        );


      option.value =
        id;


      option.textContent =
        teacher
          ? `${name} — GVCN: ${teacher}`
          : name;


      select.appendChild(
        option
      );
    }
  );


  if (
    !classes.some(
      c =>
        classKey(c) ===
        String(selectedClassId)
    )
  ) {

    selectedClassId =
      classKey(
        classes[0]
      );
  }


  select.value =
    selectedClassId;
}


function classMatchesStudent(student) {

  const studentClass =
    normalizeText(
      getStudentClass(student)
    );


  const selectedClass =
    getSelectedClass();


  if (!selectedClass) {
    return false;
  }


  const classId =
    normalizeText(
      getClassId(
        selectedClass
      )
    );


  const className =
    normalizeText(
      getClassName(
        selectedClass
      )
    );


  return (
    studentClass === classId ||
    studentClass === className ||
    studentClass ===
      normalizeText(
        selectedClassId
      )
  );
}


// =========================================================
// 11. DANH SÁCH HỌC SINH
// =========================================================

function getCurrentStudents() {

  const input =
    document.getElementById(
      "searchInput"
    );


  const keyword =
    normalizeText(
      input?.value || ""
    );


  return students.filter(
    student => {

      if (
        !classMatchesStudent(
          student
        )
      ) {

        return false;
      }


      if (!keyword) {
        return true;
      }


      const id =
        normalizeText(
          getStudentId(
            student
          )
        );


      const name =
        normalizeText(
          getStudentName(
            student
          )
        );


      return (
        id.includes(keyword) ||
        name.includes(keyword)
      );
    }
  );
}


// =========================================================
// 12. ĐIỂM
// =========================================================

function getScoreRow(studentId) {

  return scores.find(
    row =>
      normalizeText(
        getField(
          row,
          [
            "MaHS",
            "Mã HS",
            "Mã học sinh",
            "StudentID",
            "ID_HS"
          ]
        )
      ) ===
      normalizeText(
        studentId
      )
  ) || null;
}


function getAverageScore(studentId) {

  const row =
    getScoreRow(
      studentId
    );


  if (!row) {
    return "-";
  }


  const direct =
    getField(
      row,
      [
        "DiemTB",
        "Điểm TB",
        "DTB",
        "TrungBinh",
        "Trung bình"
      ],
      ""
    );


  if (
    direct !== "" &&
    Number.isFinite(
      Number(direct)
    )
  ) {

    return Number(
      direct
    ).toFixed(2);
  }


  const excluded =
    [
      "mahs",
      "id",
      "studentid",
      "malop",
      "lop",
      "tenlop",
      "hoten",
      "ghichu"
    ];


  const numbers =
    Object.entries(row)
      .filter(
        ([key, value]) => {

          return (
            !excluded.includes(
              normalizeText(
                key
              )
            ) &&
            value !== "" &&
            Number.isFinite(
              Number(value)
            )
          );
        }
      )
      .map(
        ([, value]) =>
          Number(value)
      );


  if (!numbers.length) {
    return "-";
  }


  const average =
    numbers.reduce(
      (a, b) =>
        a + b,
      0
    ) /
    numbers.length;


  return average.toFixed(2);
}


// =========================================================
// 13. THI ĐUA
// =========================================================

function getCompetitionTotal(studentId) {

  const rows =
    competitions.filter(
      row =>
        normalizeText(
          getField(
            row,
            [
              "MaHS",
              "Mã HS",
              "Mã học sinh",
              "StudentID",
              "ID_HS"
            ]
          )
        ) ===
        normalizeText(
          studentId
        )
    );


  if (!rows.length) {
    return 0;
  }


  return rows.reduce(
    (
      total,
      row
    ) => {

      return (
        total +
        numberOrZero(
          getField(
            row,
            [
              "Diem",
              "Điểm",
              "DiemThiDua",
              "Điểm thi đua"
            ],
            0
          )
        )
      );
    },
    0
  );
}


// =========================================================
// 14. HIỂN THỊ HỌC SINH
// =========================================================

function renderStudents() {

  const body =
    document.getElementById(
      "studentTableBody"
    );


  if (!body) {
    return;
  }


  const list =
    getCurrentStudents();


  body.innerHTML = "";


  if (!list.length) {

    body.innerHTML =
      '<tr>' +
      '<td colspan="9" class="empty">' +
      'Không có học sinh trong lớp đang chọn.' +
      '</td>' +
      '</tr>';

    return;
  }


  list.forEach(
    (
      student,
      index
    ) => {

      const id =
        getStudentId(
          student
        );


      const attendance =
        getAttendanceInfo(
          id
        );


      const tr =
        document.createElement(
          "tr"
        );


      tr.innerHTML = `

        <td>
          ${index + 1}
        </td>

        <td>
          ${escapeHTML(id)}
        </td>

        <td class="student-name">
          ${escapeHTML(
            getStudentName(student)
          )}
        </td>

        <td>
          ${escapeHTML(
            getGender(student)
          )}
        </td>

        <td>
          ${escapeHTML(
            formatDate(
              getBirthday(student)
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            getAverageScore(id)
          )}
        </td>

        <td>
          ${escapeHTML(
            getCompetitionTotal(id)
          )}
        </td>

        <td>
          ${attendanceBadge(
            attendance.status
          )}
        </td>

        <td>
          <button
            class="btn-primary"
            onclick="selectStudent('${escapeHTML(id)}')"
          >
            Xem
          </button>
        </td>
      `;


      body.appendChild(
        tr
      );
    }
  );
}


// =========================================================
// 15. ĐIỂM DANH
// =========================================================

function getAttendanceInfo(
  studentId,
  date = selectedDate
) {

  const rows =
    attendances.filter(
      row => {

        const sameStudent =
          normalizeText(
            getAttendanceStudentId(
              row
            )
          ) ===
          normalizeText(
            studentId
          );


        const sameDate =
          normalizeDate(
            getAttendanceDate(
              row
            )
          ) ===
          normalizeDate(
            date
          );


        return (
          sameStudent &&
          sameDate
        );
      }
    );


  if (!rows.length) {

    return {
      status:
        "Chưa xác định",
      note: ""
    };
  }


  const row =
    rows[
      rows.length - 1
    ];


  return {

    status:
      getAttendanceStatus(
        row
      ),

    note:
      getAttendanceNote(
        row
      )
  };
}


function attendanceBadge(
  status
) {

  const text =
    String(
      status ||
      "Chưa xác định"
    );


  const normalized =
    normalizeText(
      text
    );


  let className =
    "badge-unknown";


  if (
    normalized.includes(
      "comat"
    ) ||
    normalized ===
      "present"
  ) {

    className =
      "badge-present";

  } else if (
    normalized.includes(
      "muon"
    ) ||
    normalized ===
      "late"
  ) {

    className =
      "badge-late";

  } else if (
    normalized.includes(
      "vang"
    ) ||
    normalized ===
      "absent"
  ) {

    className =
      "badge-absent";

  } else if (
    normalized.includes(
      "xacnhan"
    )
  ) {

    className =
      "badge-confirm";
  }


  return `
    <span
      class="badge ${className}"
    >
      ${escapeHTML(text)}
    </span>
  `;
}


function renderAttendance() {

  const body =
    document.getElementById(
      "attendanceTableBody"
    );


  if (!body) {
    return;
  }


  const list =
    getCurrentStudents();


  body.innerHTML = "";


  if (!list.length) {

    body.innerHTML =
      '<tr>' +
      '<td colspan="4" class="empty">' +
      'Không có học sinh.' +
      '</td>' +
      '</tr>';

    return;
  }


  list.forEach(
    student => {

      const id =
        getStudentId(
          student
        );


      const info =
        getAttendanceInfo(
          id
        );


      const tr =
        document.createElement(
          "tr"
        );


      tr.innerHTML = `

        <td>
          ${escapeHTML(id)}
        </td>

        <td>
          ${escapeHTML(
            getStudentName(student)
          )}
        </td>

        <td>
          ${attendanceBadge(
            info.status
          )}
        </td>

        <td>
          ${escapeHTML(
            info.note
          )}
        </td>

      `;


      body.appendChild(
        tr
      );
    }
  );
}


// =========================================================
// 16. THỐNG KÊ
// =========================================================

function updateStatistics() {

  const list =
    getCurrentStudents();


  let present = 0;
  let late = 0;
  let absent = 0;
  let confirm = 0;


  list.forEach(
    student => {

      const status =
        normalizeText(
          getAttendanceInfo(
            getStudentId(
              student
            )
          ).status
        );


      if (
        status.includes(
          "comat"
        ) ||
        status ===
          "present"
      ) {

        present++;

      } else if (
        status.includes(
          "muon"
        ) ||
        status ===
          "late"
      ) {

        late++;

      } else if (
        status.includes(
          "vang"
        ) ||
        status ===
          "absent"
      ) {

        absent++;

      } else if (
        status.includes(
          "xacnhan"
        )
      ) {

        confirm++;
      }
    }
  );


  document.getElementById(
    "statTotal"
  ).textContent =
    list.length;


  document.getElementById(
    "statPresent"
  ).textContent =
    present;


  document.getElementById(
    "statLate"
  ).textContent =
    late;


  document.getElementById(
    "statAbsent"
  ).textContent =
    absent;


  document.getElementById(
    "statConfirm"
  ).textContent =
    confirm;
}


// =========================================================
// 17. CHỌN HỌC SINH
// =========================================================

function selectStudent(
  studentId
) {

  selectedStudentId =
    String(
      studentId
    );


  const student =
    students.find(
      s =>
        normalizeText(
          getStudentId(s)
        ) ===
        normalizeText(
          selectedStudentId
        )
    );


  if (!student) {
    return;
  }


  const box =
    document.getElementById(
      "selectedStudentBox"
    );


  if (!box) {
    return;
  }


  box.className =
    "selected-student";


  box.innerHTML = `

    <strong>
      ${escapeHTML(
        getStudentName(student)
      )}
    </strong>

    <br>

    Mã HS:
    ${escapeHTML(
      getStudentId(student)
    )}

    <br>

    Lớp:
    ${escapeHTML(
      getClassName(
        getSelectedClass() ||
        {}
      )
    )}

    <br><br>

    <div class="attendance-buttons">

      <button
        class="btn-success"
        onclick="
          manualAttendance(
            '${escapeHTML(selectedStudentId)}',
            'Có mặt'
          )
        "
      >
        ✅ Có mặt
      </button>


      <button
        class="btn-warning"
        onclick="
          manualAttendance(
            '${escapeHTML(selectedStudentId)}',
            'Đi muộn'
          )
        "
      >
        ⏰ Đi muộn
      </button>


      <button
        class="btn-danger"
        onclick="
          manualAttendance(
            '${escapeHTML(selectedStudentId)}',
            'Vắng'
          )
        "
      >
        ❌ Vắng
      </button>

    </div>

  `;


  renderScoreDetail(
    student
  );


  renderCompetitionDetail(
    student
  );
}


window.selectStudent =
  selectStudent;


// =========================================================
// 18. CHI TIẾT ĐIỂM
// =========================================================

function renderScoreDetail(
  student
) {

  const box =
    document.getElementById(
      "scoreDetail"
    );


  if (!box) {
    return;
  }


  const row =
    getScoreRow(
      getStudentId(student)
    );


  if (!row) {

    box.innerHTML =
      "Chưa có dữ liệu điểm.";

    return;
  }


  const entries =
    Object.entries(
      row
    ).filter(
      ([key]) =>
        ![
          "MaHS",
          "Mã HS",
          "Mã học sinh"
        ].includes(key)
    );


  box.innerHTML =
    entries
      .map(
        ([key, value]) =>
          `
          <div>
            <strong>
              ${escapeHTML(key)}:
            </strong>

            ${escapeHTML(value)}
          </div>
          `
      )
      .join("");
}


// =========================================================
// 19. CHI TIẾT THI ĐUA
// =========================================================

function renderCompetitionDetail(
  student
) {

  const box =
    document.getElementById(
      "competitionDetail"
    );


  if (!box) {
    return;
  }


  const id =
    getStudentId(
      student
    );


  const rows =
    competitions.filter(
      row =>
        normalizeText(
          getField(
            row,
            [
              "MaHS",
              "Mã HS",
              "Mã học sinh"
            ]
          )
        ) ===
        normalizeText(
          id
        )
    );


  if (!rows.length) {

    box.innerHTML =
      "Chưa có dữ liệu thi đua.";

    return;
  }


  box.innerHTML =
    rows
      .map(
        row =>
          `
          <div>
            ${Object.entries(row)
              .map(
                ([key, value]) =>
                  `
                  <strong>
                    ${escapeHTML(key)}:
                  </strong>
                  ${escapeHTML(value)}
                  `
              )
              .join(
                " &nbsp; | &nbsp; "
              )}
          </div>

          <hr>
          `
      )
      .join("");
}


// =========================================================
// 20. GHI ĐIỂM DANH
// =========================================================

async function saveAttendance(
  studentId,
  status,
  note = ""
) {

  const date =
    selectedDate ||
    todayISO();


  const student =
    students.find(
      s =>
        normalizeText(
          getStudentId(s)
        ) ===
        normalizeText(
          studentId
        )
    );


  if (!student) {

    throw new Error(
      "Không tìm thấy học sinh."
    );
  }


  const record = {

    MaHS:
      studentId,

    HoTen:
      getStudentName(
        student
      ),

    MaLop:
      getClassId(
        getSelectedClass() ||
        {}
      ) ||
      selectedClassId,

    Ngay:
      date,

    TrangThai:
      status,

    GhiChu:
      note,

    ThoiGian:
      new Date()
        .toLocaleTimeString(
          "vi-VN"
        )
  };


  /*
   * Cập nhật ngay giao diện.
   *
   * Lưu ý:
   * Nếu APPS_SCRIPT_URL còn để trống,
   * dữ liệu chỉ thay đổi trên giao diện
   * hiện tại, chưa ghi vĩnh viễn vào Sheet.
   */

  attendances.push(
    record
  );


  /*
   * Nếu sau này có Google Apps Script,
   * code sẽ gửi dữ liệu lên đó.
   */

  if (
    CONFIG.APPS_SCRIPT_URL
  ) {

    const response =
      await fetch(
        CONFIG.APPS_SCRIPT_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify(
              {
                action:
                  "attendance",

                data:
                  record
              }
            )
        }
      );


    if (!response.ok) {

      throw new Error(
        "Apps Script HTTP " +
        response.status
      );
    }
  }


  renderAll();


  selectStudent(
    studentId
  );


  showStatus(
    `✅ ${getStudentName(student)}: ${status}`,
    "success"
  );


  setTimeout(
    clearStatus,
    2500
  );
}


window.saveAttendance =
  saveAttendance;


async function manualAttendance(
  studentId,
  status
) {

  try {

    await saveAttendance(
      studentId,
      status,
      "Điểm danh thủ công"
    );

  } catch (error) {

    console.error(
      error
    );

    showStatus(
      "❌ " +
      error.message,
      "error"
    );
  }
}


window.manualAttendance =
  manualAttendance;


// =========================================================
// 21. CAMERA
// =========================================================

async function startCamera() {

  try {

    if (
      !navigator
        .mediaDevices ||
      !navigator
        .mediaDevices
        .getUserMedia
    ) {

      throw new Error(
        "Trình duyệt không hỗ trợ camera."
      );
    }


    videoStream =
      await navigator
        .mediaDevices
        .getUserMedia(
          {
            video: {
              facingMode:
                "user"
            },

            audio:
              false
          }
        );


    const video =
      document.getElementById(
        "video"
      );


    video.srcObject =
      videoStream;


    document.getElementById(
      "cameraPlaceholder"
    ).style.display =
      "none";


    document.getElementById(
      "captureBtn"
    ).disabled =
      false;


    document.getElementById(
      "cameraStatus"
    ).textContent =
      "🟢 Camera đang hoạt động";

  } catch (error) {

    console.error(
      error
    );


    document.getElementById(
      "cameraStatus"
    ).textContent =
      "🔴 Không bật được camera: " +
      error.message;


    showStatus(
      "❌ " +
      error.message,
      "error"
    );
  }
}


function stopCamera() {

  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        track =>
          track.stop()
      );

    videoStream =
      null;
  }


  const video =
    document.getElementById(
      "video"
    );


  if (video) {
    video.srcObject =
      null;
  }


  document.getElementById(
    "cameraPlaceholder"
  ).style.display =
    "block";


  document.getElementById(
    "captureBtn"
  ).disabled =
    true;


  document.getElementById(
    "cameraStatus"
  ).textContent =
    "⚪ Camera chưa hoạt động";
}


function captureFrame() {

  const video =
    document.getElementById(
      "video"
    );


  if (
    !videoStream ||
    !video.videoWidth
  ) {

    showStatus(
      "⚠️ Hãy bật camera trước.",
      "error"
    );

    return;
  }


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    video.videoWidth;


  canvas.height =
    video.videoHeight;


  canvas
    .getContext("2d")
    .drawImage(
      video,
      0,
      0
    );


  document.getElementById(
    "cameraStatus"
  ).textContent =
    "📸 Đã chụp khung hình kiểm tra camera.";


  showStatus(
    "📸 Camera hoạt động bình thường. Nhận diện khuôn mặt sẽ làm ở bước tiếp theo.",
    "success"
  );


  setTimeout(
    clearStatus,
    3000
  );
}


// =========================================================
// 22. RENDER LẠI TOÀN BỘ
// =========================================================

function renderAll() {

  renderClassSelect();

  renderStudents();

  renderAttendance();

  updateStatistics();


  if (
    selectedStudentId
  ) {

    const student =
      students.find(
        s =>
          normalizeText(
            getStudentId(s)
          ) ===
          normalizeText(
            selectedStudentId
          )
      );


    if (student) {

      selectStudent(
        selectedStudentId
      );
    }
  }
}


// =========================================================
// 23. SỰ KIỆN
// =========================================================

function setupEvents() {

  const classSelect =
    document.getElementById(
      "classSelect"
    );


  const searchInput =
    document.getElementById(
      "searchInput"
    );


  const dateInput =
    document.getElementById(
      "attendanceDate"
    );


  const reloadBtn =
    document.getElementById(
      "reloadBtn"
    );


  selectedDate =
    todayISO();


  if (dateInput) {

    dateInput.value =
      selectedDate;
  }


  if (classSelect) {

    classSelect.addEventListener(
      "change",
      event => {

        selectedClassId =
          event.target.value;


        selectedStudentId =
          "";


        renderAll();
      }
    );
  }


  if (searchInput) {

    searchInput.addEventListener(
      "input",
      () => {

        renderAll();

      }
    );
  }


  if (dateInput) {

    dateInput.addEventListener(
      "change",
      event => {

        selectedDate =
          event.target.value ||
          todayISO();


        renderAll();
      }
    );
  }


  if (reloadBtn) {

    reloadBtn.addEventListener(
      "click",
      loadAllData
    );
  }


  const startCameraBtn =
    document.getElementById(
      "startCameraBtn"
    );


  if (startCameraBtn) {

    startCameraBtn.addEventListener(
      "click",
      startCamera
    );
  }


  const stopCameraBtn =
    document.getElementById(
      "stopCameraBtn"
    );


  if (stopCameraBtn) {

    stopCameraBtn.addEventListener(
      "click",
      stopCamera
    );
  }


  const captureBtn =
    document.getElementById(
      "captureBtn"
    );


  if (captureBtn) {

    captureBtn.addEventListener(
      "click",
      captureFrame
    );
  }
}


// =========================================================
// 24. KHỞI ĐỘNG
// =========================================================

async function initApp() {

  console.log(
    "Ứng dụng bắt đầu..."
  );


  setupEvents();


  await loadAllData();
}


document.addEventListener(
  "DOMContentLoaded",
  initApp
);

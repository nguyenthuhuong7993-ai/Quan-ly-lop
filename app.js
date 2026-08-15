/* ============================================================
   TRỢ LÝ AI – QUẢN LÝ LỚP HỌC
   KẾT NỐI GOOGLE SHEETS
   ============================================================ */


/* ============================================================
   1. CẤU HÌNH GOOGLE SHEET
   ============================================================ */

const SPREADSHEET_ID =
    "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU";


/*
   Tên các Sheet trong Google Sheets.
   
   Theo file hiện tại:
   LOP
   HOCSINH
   DIEM
   THIDUA
   DIEMDANH
*/

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

let data = {
    lop: [],
    hocSinh: [],
    diem: [],
    thiDua: [],
    diemDanh: []
};

let currentClass = "";

let currentDate = "";


/* ============================================================
   3. HÀM TIỆN ÍCH
   ============================================================ */

function normalize(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function findColumn(row, names) {

    const keys = Object.keys(row);

    for (const name of names) {

        const target = normalize(name);

        const found = keys.find(key => {
            return normalize(key) === target;
        });

        if (found) {
            return row[found];
        }
    }

    return "";
}


function findColumnContains(row, names) {

    const keys = Object.keys(row);

    for (const name of names) {

        const target = normalize(name);

        const found = keys.find(key => {
            return normalize(key).includes(target);
        });

        if (found) {
            return row[found];
        }
    }

    return "";
}


/* ============================================================
   4. HIỂN THỊ LỖI
   ============================================================ */

function showError(message) {

    const box = document.getElementById("errorBox");

    box.style.display = "block";

    box.innerHTML = `
        <strong>❌ Lỗi tải dữ liệu</strong><br><br>
        ${escapeHTML(message)}
        <br><br>
        <small>
        Kiểm tra Google Sheet đã được chia sẻ:
        <b>Anyone with the link → Viewer</b>
        </small>
    `;
}


function hideError() {

    const box = document.getElementById("errorBox");

    box.style.display = "none";
}


/* ============================================================
   5. LẤY DỮ LIỆU GOOGLE SHEETS
   ============================================================ */

async function fetchSheet(sheetName) {

    const url =
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

    console.log("Đang tải Sheet:", sheetName);

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {

        throw new Error(
            `Google Sheet "${sheetName}" trả về HTTP ${response.status}`
        );
    }

    const text = await response.text();

    /*
       Google trả về:

       /*O_o*/
       google.visualization.Query.setResponse({...});

       Ta lấy phần JSON nằm trong ngoặc.
    */

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {

        throw new Error(
            `Không đọc được dữ liệu Sheet "${sheetName}".`
        );
    }

    const jsonText = text.substring(start, end + 1);

    let json;

    try {

        json = JSON.parse(jsonText);

    } catch (error) {

        console.error("Dữ liệu Google trả về:", text);

        throw new Error(
            `Dữ liệu Sheet "${sheetName}" không đúng định dạng.`
        );
    }

    if (
        !json.table ||
        !Array.isArray(json.table.cols)
    ) {

        throw new Error(
            `Sheet "${sheetName}" không có dữ liệu hợp lệ.`
        );
    }

    const columns = json.table.cols.map(
        (col, index) => {

            return (
                col.label ||
                col.id ||
                `Cột ${index + 1}`
            );
        }
    );

    const rows = [];

    if (json.table.rows) {

        json.table.rows.forEach(row => {

            const item = {};

            columns.forEach((column, index) => {

                const cell =
                    row.c &&
                    row.c[index];

                item[column] =
                    cell && cell.v !== null
                        ? cell.v
                        : "";
            });

            rows.push(item);
        });
    }

    console.log(
        `Sheet ${sheetName}:`,
        rows.length,
        "dòng"
    );

    return rows;
}


/* ============================================================
   6. TẢI TOÀN BỘ DỮ LIỆU
   ============================================================ */

async function loadAllData() {

    hideError();

    console.log("=================================");
    console.log("ĐANG TẢI TOÀN BỘ DỮ LIỆU");
    console.log("=================================");

    try {

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

        data.lop = lop;
        data.hocSinh = hocSinh;
        data.diem = diem;
        data.thiDua = thiDua;
        data.diemDanh = diemDanh;

        console.log("Dữ liệu lớp:", data.lop);
        console.log("Dữ liệu học sinh:", data.hocSinh);
        console.log("Dữ liệu điểm:", data.diem);
        console.log("Dữ liệu thi đua:", data.thiDua);
        console.log("Dữ liệu điểm danh:", data.diemDanh);

        console.log(
            "Số lớp:",
            data.lop.length
        );

        console.log(
            "Số học sinh:",
            data.hocSinh.length
        );

        buildClassList();

        if (!currentClass) {

            const classes = getClassNames();

            if (classes.length > 0) {
                currentClass = classes[0];
            }
        }

        const select =
            document.getElementById("classSelect");

        if (select && currentClass) {
            select.value = currentClass;
        }

        renderAll();

        console.log(
            "========== ĐÃ TẢI XONG TOÀN BỘ DỮ LIỆU =========="
        );

    } catch (error) {

        console.error(error);

        showError(error.message);

        document.getElementById("studentTable").innerHTML =
            `<div class="empty">Không tải được dữ liệu.</div>`;

        document.getElementById("scoreTable").innerHTML =
            `<div class="empty">Không tải được dữ liệu.</div>`;

        document.getElementById("competitionTable").innerHTML =
            `<div class="empty">Không tải được dữ liệu.</div>`;

        document.getElementById("attendanceTable").innerHTML =
            `<div class="empty">Không tải được dữ liệu.</div>`;
    }
}


/* ============================================================
   7. XÁC ĐỊNH DANH SÁCH LỚP
   ============================================================ */

function getClassNames() {

    const result = [];

    function addClass(value) {

        if (!value) return;

        const name = String(value).trim();

        if (!name) return;

        if (!result.includes(name)) {

            result.push(name);
        }
    }


    /* Sheet LOP */

    data.lop.forEach(row => {

        const className =
            findColumn(
                row,
                [
                    "Lớp",
                    "lop",
                    "Tên lớp",
                    "Ten lop",
                    "class",
                    "Class"
                ]
            );

        addClass(className);

    });


    /* Nếu Sheet LOP không có tên lớp,
       lấy từ HOCSINH */

    if (result.length === 0) {

        data.hocSinh.forEach(row => {

            const className =
                findColumn(
                    row,
                    [
                        "Lớp",
                        "lop",
                        "Tên lớp",
                        "Ten lop",
                        "class",
                        "Class"
                    ]
                );

            addClass(className);

        });
    }


    /* Nếu vẫn không có,
       lấy từ điểm danh */

    if (result.length === 0) {

        data.diemDanh.forEach(row => {

            const className =
                findColumn(
                    row,
                    [
                        "Lớp",
                        "lop",
                        "Tên lớp",
                        "Ten lop",
                        "class",
                        "Class"
                    ]
                );

            addClass(className);

        });
    }


    return result;
}


/* ============================================================
   8. TẠO DANH SÁCH LỚP TRÊN GIAO DIỆN
   ============================================================ */

function buildClassList() {

    const select =
        document.getElementById("classSelect");

    const classes =
        getClassNames();

    select.innerHTML = "";

    if (classes.length === 0) {

        select.innerHTML =
            `<option value="">Không tìm thấy lớp</option>`;

        currentClass = "";

        return;
    }


    classes.forEach(className => {

        const option =
            document.createElement("option");

        option.value = className;

        option.textContent = className;

        select.appendChild(option);

        console.log(
            "Đã thêm lớp:",
            className
        );
    });


    if (
        currentClass &&
        classes.includes(currentClass)
    ) {

        select.value = currentClass;

    } else {

        currentClass = classes[0];

        select.value = currentClass;
    }
}


/* ============================================================
   9. LẤY THÔNG TIN HỌC SINH
   ============================================================ */

function getStudentId(row) {

    return findColumnContains(
        row,
        [
            "mã hs",
            "ma hs",
            "mahs",
            "mã học sinh",
            "ma hoc sinh",
            "student id",
            "id"
        ]
    );
}


function getStudentName(row) {

    return findColumnContains(
        row,
        [
            "họ và tên",
            "ho va ten",
            "họ tên",
            "ho ten",
            "tên học sinh",
            "ten hoc sinh",
            "name"
        ]
    );
}


function getStudentClass(row) {

    return findColumnContains(
        row,
        [
            "lớp",
            "lop",
            "class"
        ]
    );
}


/* ============================================================
   10. LỌC HỌC SINH THEO LỚP
   ============================================================ */

function getStudentsByClass() {

    let students =
        data.hocSinh.filter(row => {

            const className =
                getStudentClass(row);

            return normalize(className) ===
                normalize(currentClass);
        });


    /*
       Nếu HOCSINH không có cột Lớp,
       thử lấy danh sách mã HS từ Sheet LOP.
    */

    if (
        students.length === 0 &&
        currentClass
    ) {

        const classRows =
            data.lop.filter(row => {

                const className =
                    findColumnContains(
                        row,
                        [
                            "lớp",
                            "lop",
                            "class"
                        ]
                    );

                return normalize(className) ===
                    normalize(currentClass);
            });


        const ids =
            new Set(
                classRows
                    .map(row => getStudentId(row))
                    .filter(Boolean)
                    .map(normalize)
            );


        if (ids.size > 0) {

            students =
                data.hocSinh.filter(row => {

                    return ids.has(
                        normalize(
                            getStudentId(row)
                        )
                    );
                });
        }
    }


    return students;
}


/* ============================================================
   11. TÌM KIẾM HỌC SINH
   ============================================================ */

function getFilteredStudents() {

    const students =
        getStudentsByClass();

    const input =
        document.getElementById(
            "studentSearch"
        );

    const keyword =
        normalize(input.value);


    if (!keyword) {
        return students;
    }


    return students.filter(row => {

        const id =
            normalize(getStudentId(row));

        const name =
            normalize(getStudentName(row));

        return (
            id.includes(keyword) ||
            name.includes(keyword)
        );
    });
}


/* ============================================================
   12. HIỂN THỊ DANH SÁCH HỌC SINH
   ============================================================ */

function renderStudents() {

    const students =
        getFilteredStudents();

    const container =
        document.getElementById(
            "studentTable"
        );


    if (students.length === 0) {

        container.innerHTML =
            `<div class="empty">
                Không tìm thấy học sinh.
             </div>`;

        return;
    }


    let html = `
        <table>
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Mã HS</th>
                    <th>Họ và tên</th>
                    <th>Lớp</th>
                </tr>
            </thead>
            <tbody>
    `;


    students.forEach((student, index) => {

        html += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    ${escapeHTML(
                        getStudentId(student)
                    )}
                </td>
                <td>
                    ${escapeHTML(
                        getStudentName(student)
                    )}
                </td>
                <td>
                    ${escapeHTML(
                        getStudentClass(student) ||
                        currentClass
                    )}
                </td>
            </tr>
        `;
    });


    html += `
            </tbody>
        </table>
    `;


    container.innerHTML = html;
}


/* ============================================================
   13. LẤY ĐIỂM
   ============================================================ */

function getScoreStudentId(row) {

    return getStudentId(row);
}


function getSubject(row) {

    return findColumnContains(
        row,
        [
            "môn",
            "mon",
            "môn học",
            "mon hoc",
            "subject"
        ]
    );
}


function getScore(row) {

    return findColumnContains(
        row,
        [
            "điểm",
            "diem",
            "điểm số",
            "diem so",
            "score"
        ]
    );
}


/* ============================================================
   14. HIỂN THỊ ĐIỂM
   ============================================================ */

function renderScores() {

    const students =
        getStudentsByClass();

    const studentIds =
        new Set(
            students
                .map(getStudentId)
                .filter(Boolean)
                .map(normalize)
        );


    let scores =
        data.diem.filter(row => {

            const id =
                normalize(
                    getScoreStudentId(row)
                );

            return (
                id &&
                studentIds.has(id)
            );
        });


    /*
       Nếu Sheet DIEM có cột lớp,
       hỗ trợ lọc trực tiếp.
    */

    if (scores.length === 0) {

        scores =
            data.diem.filter(row => {

                const lop =
                    findColumnContains(
                        row,
                        [
                            "lớp",
                            "lop",
                            "class"
                        ]
                    );

                if (!lop) return false;

                return normalize(lop) ===
                    normalize(currentClass);
            });
    }


    const container =
        document.getElementById(
            "scoreTable"
        );


    if (scores.length === 0) {

        /*
           Nếu chưa có dữ liệu điểm,
           vẫn hiển thị danh sách học sinh.
        */

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Mã HS</th>
                        <th>Họ và tên</th>
                        <th>Môn</th>
                        <th>Điểm</th>
                    </tr>
                </thead>
                <tbody>
        `;


        students.forEach((student, index) => {

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHTML(
                        getStudentId(student)
                    )}</td>
                    <td>${escapeHTML(
                        getStudentName(student) || "—"
                    )}</td>
                    <td>—</td>
                    <td>—</td>
                </tr>
            `;
        });


        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

        return;
    }


    let html = `
        <table>
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Mã HS</th>
                    <th>Họ và tên</th>
                    <th>Môn</th>
                    <th>Điểm</th>
                </tr>
            </thead>
            <tbody>
    `;


    scores.forEach((row, index) => {

        const id =
            getScoreStudentId(row);

        const student =
            students.find(
                s =>
                    normalize(
                        getStudentId(s)
                    ) === normalize(id)
            );


        html += `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(id)}
                </td>

                <td>
                    ${escapeHTML(
                        student
                            ? getStudentName(student)
                            : "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        getSubject(row) || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        getScore(row) || "—"
                    )}
                </td>
            </tr>
        `;
    });


    html += `
            </tbody>
        </table>
    `;


    container.innerHTML = html;
}


/* ============================================================
   15. THI ĐUA
   ============================================================ */

function getCompetitionClass(row) {

    return findColumnContains(
        row,
        [
            "lớp",
            "lop",
            "class"
        ]
    );
}


function getCompetitionScore(row) {

    return findColumnContains(
        row,
        [
            "điểm thi đua",
            "diem thi dua",
            "điểm",
            "diem",
            "score"
        ]
    );
}


function getCompetitionRank(row) {

    return findColumnContains(
        row,
        [
            "xếp hạng",
            "xep hang",
            "hạng",
            "hang",
            "rank"
        ]
    );
}


/* ============================================================
   16. HIỂN THỊ THI ĐUA
   ============================================================ */

function renderCompetition() {

    let rows =
        data.thiDua.filter(row => {

            const className =
                getCompetitionClass(row);

            return normalize(className) ===
                normalize(currentClass);
        });


    /*
       Nếu Sheet THIDUA không có dữ liệu
       của lớp hiện tại thì thử tìm tất cả.
    */

    if (rows.length === 0) {

        rows = data.thiDua;
    }


    const container =
        document.getElementById(
            "competitionTable"
        );


    if (rows.length === 0) {

        container.innerHTML =
            `<div class="empty">
                Chưa có dữ liệu thi đua.
             </div>`;

        return;
    }


    let html = `
        <table>
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Lớp</th>
                    <th>Điểm thi đua</th>
                    <th>Xếp hạng</th>
                </tr>
            </thead>
            <tbody>
    `;


    rows.forEach((row, index) => {

        html += `
            <tr>
                <td>${index + 1}</td>

                <td>
                    ${escapeHTML(
                        getCompetitionClass(row) ||
                        currentClass
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        getCompetitionScore(row) || "—"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        getCompetitionRank(row) || "—"
                    )}
                </td>
            </tr>
        `;
    });


    html += `
            </tbody>
        </table>
    `;


    container.innerHTML = html;
}


/* ============================================================
   17. ĐIỂM DANH
   ============================================================ */

function getAttendanceStatus(row) {

    return findColumnContains(
        row,
        [
            "trạng thái",
            "trang thai",
            "status",
            "tình trạng",
            "tinh trang"
        ]
    );
}


function getAttendanceDate(row) {

    return findColumnContains(
        row,
        [
            "ngày",
            "ngay",
            "ngày điểm danh",
            "ngay diem danh",
            "date"
        ]
    );
}


function getAttendanceClass(row) {

    return findColumnContains(
        row,
        [
            "lớp",
            "lop",
            "class"
        ]
    );
}


/* ============================================================
   18. CHUẨN HÓA NGÀY
   ============================================================ */

function normalizeDate(value) {

    if (!value) {
        return "";
    }


    let text =
        String(value).trim();


    /*
       dd/mm/yyyy
    */

    let match =
        text.match(
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
        );


    if (match) {

        return (
            match[3] +
            "-" +
            match[2].padStart(2, "0") +
            "-" +
            match[1].padStart(2, "0")
        );
    }


    /*
       yyyy-mm-dd
    */

    match =
        text.match(
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/
        );


    if (match) {

        return (
            match[1] +
            "-" +
            match[2].padStart(2, "0") +
            "-" +
            match[3].padStart(2, "0")
        );
    }


    /*
       Google Sheets đôi khi trả:
       Date(2026,7,15)
    */

    match =
        text.match(
            /Date\((\d+),(\d+),(\d+)\)/
        );


    if (match) {

        return (
            match[1] +
            "-" +
            String(
                Number(match[2]) + 1
            ).padStart(2, "0") +
            "-" +
            String(
                match[3]
            ).padStart(2, "0")
        );
    }


    return text;
}


/* ============================================================
   19. TRẠNG THÁI ĐIỂM DANH
   ============================================================ */

function statusType(status) {

    const value =
        normalize(status);


    if (
        value.includes("co mat") ||
        value.includes("present") ||
        value === "có"
    ) {

        return "present";
    }


    if (
        value.includes("di muon") ||
        value.includes("muon") ||
        value.includes("late")
    ) {

        return "late";
    }


    if (
        value.includes("vang") ||
        value.includes("absent") ||
        value.includes("nghi")
    ) {

        return "absent";
    }


    return "unknown";
}


function statusBadge(status) {

    const type =
        statusType(status);


    let className =
        "badge badge-unknown";


    if (type === "present") {
        className =
            "badge badge-present";
    }

    if (type === "late") {
        className =
            "badge badge-late";
    }

    if (type === "absent") {
        className =
            "badge badge-absent";
    }


    return `
        <span class="${className}">
            ${escapeHTML(status || "Chưa xác định")}
        </span>
    `;
}


/* ============================================================
   20. LỌC ĐIỂM DANH
   ============================================================ */

function getAttendanceRows() {

    const students =
        getStudentsByClass();


    const studentIds =
        new Set(
            students
                .map(getStudentId)
                .filter(Boolean)
                .map(normalize)
        );


    let rows =
        data.diemDanh.filter(row => {

            const className =
                getAttendanceClass(row);


            const id =
                normalize(
                    getStudentId(row)
                );


            const classOK =
                className
                    ? normalize(className) ===
                      normalize(currentClass)
                    : true;


            const studentOK =
                id
                    ? studentIds.has(id)
                    : false;


            return classOK && studentOK;
        });


    /*
       Lọc ngày.
       Chỉ lọc nếu Sheet có cột ngày
       và người dùng đã chọn ngày.
    */

    if (currentDate) {

        const hasDateColumn =
            rows.some(
                row =>
                    getAttendanceDate(row) !== ""
            );


        if (hasDateColumn) {

            rows =
                rows.filter(row => {

                    return (
                        normalizeDate(
                            getAttendanceDate(row)
                        ) === currentDate
                    );
                });
        }
    }


    return rows;
}


/* ============================================================
   21. HIỂN THỊ ĐIỂM DANH
   ============================================================ */

function renderAttendance() {

    const students =
        getStudentsByClass();

    const rows =
        getAttendanceRows();


    const container =
        document.getElementById(
            "attendanceTable"
        );


    /*
       Tạo Map để tìm trạng thái
       theo mã học sinh.
    */

    const attendanceMap =
        new Map();


    rows.forEach(row => {

        const id =
            normalize(
                getStudentId(row)
            );

        if (id) {

            attendanceMap.set(
                id,
                getAttendanceStatus(row)
            );
        }
    });


    let html = `
        <table>
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Mã HS</th>
                    <th>Họ tên</th>
                    <th>Trạng thái</th>
                    <th>Ngày</th>
                </tr>
            </thead>
            <tbody>
    `;


    if (students.length === 0) {

        container.innerHTML =
            `<div class="empty">
                Không có học sinh.
             </div>`;

        return;
    }


    students.forEach((student, index) => {

        const id =
            getStudentId(student);

        const key =
            normalize(id);


        const status =
            attendanceMap.get(key) ||
            "Chưa xác định";


        html += `
            <tr>

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(id)}
                </td>

                <td>
                    ${escapeHTML(
                        getStudentName(student)
                    )}
                </td>

                <td>
                    ${statusBadge(status)}
                </td>

                <td>
                    ${formatDisplayDate(
                        currentDate
                    )}
                </td>

            </tr>
        `;
    });


    html += `
            </tbody>
        </table>
    `;


    container.innerHTML = html;


    updateStatistics(
        students,
        attendanceMap
    );
}


/* ============================================================
   22. HIỂN THỊ NGÀY
   ============================================================ */

function formatDisplayDate(value) {

    if (!value) {
        return "";
    }


    const match =
        value.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (!match) {
        return value;
    }


    return (
        match[3] +
        "/" +
        match[2] +
        "/" +
        match[1]
    );
}


/* ============================================================
   23. THỐNG KÊ
   ============================================================ */

function updateStatistics(
    students,
    attendanceMap
) {

    let present = 0;
    let late = 0;
    let absent = 0;
    let unknown = 0;


    students.forEach(student => {

        const id =
            normalize(
                getStudentId(student)
            );


        const status =
            attendanceMap.get(id) ||
            "";


        const type =
            statusType(status);


        if (type === "present") {
            present++;
        }

        else if (type === "late") {
            late++;
        }

        else if (type === "absent") {
            absent++;
        }

        else {
            unknown++;
        }
    });


    document.getElementById(
        "totalStudents"
    ).textContent =
        students.length;


    document.getElementById(
        "presentCount"
    ).textContent =
        present;


    document.getElementById(
        "lateCount"
    ).textContent =
        late;


    document.getElementById(
        "absentCount"
    ).textContent =
        absent;


    document.getElementById(
        "unknownCount"
    ).textContent =
        unknown;
}


/* ============================================================
   24. HIỂN THỊ TOÀN BỘ
   ============================================================ */

function renderAll() {

    console.log(
        "Hiển thị dữ liệu lớp:",
        currentClass
    );

    renderStudents();

    renderScores();

    renderCompetition();

    renderAttendance();
}


/* ============================================================
   25. SỰ KIỆN CHỌN LỚP
   ============================================================ */

function setupEvents() {

    const classSelect =
        document.getElementById(
            "classSelect"
        );


    classSelect.addEventListener(
        "change",
        function () {

            currentClass =
                this.value;

            console.log(
                "Đã chọn lớp:",
                currentClass
            );

            renderAll();
        }
    );


    const studentSearch =
        document.getElementById(
            "studentSearch"
        );


    studentSearch.addEventListener(
        "input",
        function () {

            renderStudents();

            renderScores();

            renderAttendance();
        }
    );


    const dateInput =
        document.getElementById(
            "attendanceDate"
        );


    dateInput.addEventListener(
        "change",
        function () {

            currentDate =
                this.value;

            console.log(
                "Ngày điểm danh:",
                currentDate
            );

            renderAttendance();
        }
    );


    const reloadButton =
        document.getElementById(
            "reloadButton"
        );


    reloadButton.addEventListener(
        "click",
        async function () {

            this.disabled = true;

            this.textContent =
                "⏳ Đang tải...";


            try {

                await loadAllData();

            } finally {

                this.disabled = false;

                this.textContent =
                    "🔄 Tải lại";
            }
        }
    );
}


/* ============================================================
   26. ĐẶT NGÀY HIỆN TẠI
   ============================================================ */

function setToday() {

    const input =
        document.getElementById(
            "attendanceDate"
        );


    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    const date =
        `${year}-${month}-${day}`;


    input.value = date;

    currentDate = date;
}


/* ============================================================
   27. KHỞI ĐỘNG ỨNG DỤNG
   ============================================================ */

async function initApp() {

    console.log(
        "🤖 Ứng dụng bắt đầu..."
    );


    setToday();

    setupEvents();

    await loadAllData();
}


/* ============================================================
   28. CHẠY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initApp
);

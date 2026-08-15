/* =========================================================
   TRỢ LÝ AI – QUẢN LÝ LỚP HỌC
   KẾT NỐI GOOGLE SHEETS
   ========================================================= */


/* =========================================================
   1. CẤU HÌNH
   ========================================================= */

const CONFIG = {

    spreadsheetId:
        "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU",

    sheets: {

        classes: "LOP",

        students: "HOCSINH",

        scores: "DIEM",

        competition: "THIDUA",

        attendance: "DIEMDANH"

    }

};


/* =========================================================
   2. DỮ LIỆU ỨNG DỤNG
   ========================================================= */

const DATA = {

    classes: [],

    students: [],

    scores: [],

    competition: [],

    attendance: []

};


let selectedClass = "";

let cameraStream = null;


/* =========================================================
   3. HÀM TIỆN ÍCH
   ========================================================= */

function $(id) {

    return document.getElementById(id);

}


function showMessage(text, type = "loading") {

    const box = $("message");

    if (!box) return;

    box.textContent = text;

    box.className = "message " + type;

}


function hideMessage() {

    const box = $("message");

    if (!box) return;

    box.className = "message";

    box.textContent = "";

}


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


function clean(value) {

    if (value === null || value === undefined) {

        return "";

    }

    return String(value).trim();

}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   4. ĐỌC GOOGLE SHEETS
   ========================================================= */

async function fetchSheet(sheetName) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        CONFIG.spreadsheetId +
        "/gviz/tq?tqx=out:json&sheet=" +
        encodeURIComponent(sheetName);


    console.log("Đang tải sheet:", sheetName);


    const response = await fetch(url, {

        method: "GET",

        cache: "no-store"

    });


    if (!response.ok) {

        throw new Error(
            "Không thể tải sheet " +
            sheetName +
            ". HTTP " +
            response.status
        );

    }


    const text = await response.text();


    /*
       Google trả về:

       google.visualization.Query.setResponse({...})
    */

    const start = text.indexOf("{");

    const end = text.lastIndexOf("}");


    if (start === -1 || end === -1) {

        throw new Error(
            "Dữ liệu Google Sheets không hợp lệ: " +
            sheetName
        );

    }


    const json =
        JSON.parse(
            text.substring(start, end + 1)
        );


    if (
        !json.table ||
        !json.table.cols
    ) {

        throw new Error(
            "Không tìm thấy cấu trúc bảng: " +
            sheetName
        );

    }


    const columns =
        json.table.cols.map(
            (column, index) => {

                let label =
                    clean(column.label);

                /*
                   Một số sheet có header trống.
                   Tạo tên cột dự phòng.
                */

                if (!label) {

                    label = "COL_" + index;

                }

                return label;

            }
        );


    const rows =
        (json.table.rows || []).map(
            row => {

                const obj = {};

                columns.forEach(
                    (column, index) => {

                        const cell =
                            row.c &&
                            row.c[index];

                        obj[column] =
                            cell
                                ? clean(
                                    cell.f ??
                                    cell.v ??
                                    ""
                                )
                                : "";

                    }
                );


                return obj;

            }
        );


    console.log(
        "Đã tải:",
        sheetName,
        rows.length,
        "dòng"
    );


    console.log(
        "Tên cột:",
        columns
    );


    return {

        columns,

        rows

    };

}


/* =========================================================
   5. TÌM GIÁ TRỊ THEO NHIỀU TÊN CỘT
   ========================================================= */

function getField(row, names) {

    if (!row) return "";


    const keys =
        Object.keys(row);


    /*
       Ưu tiên tên cột chính xác
    */

    for (const name of names) {

        if (
            Object.prototype.hasOwnProperty.call(
                row,
                name
            )
        ) {

            const value =
                clean(row[name]);

            if (value !== "") {

                return value;

            }

        }

    }


    /*
       Nếu không khớp chính xác,
       thử khớp không dấu + chữ thường.
    */

    const normalizedKeys =
        keys.map(key => ({

            original: key,

            normalized: normalize(key)

        }));


    for (const name of names) {

        const target =
            normalize(name);


        const found =
            normalizedKeys.find(
                item =>
                    item.normalized === target
            );


        if (found) {

            const value =
                clean(row[found.original]);

            if (value !== "") {

                return value;

            }

        }

    }


    return "";

}


/* =========================================================
   6. CHUYỂN DỮ LIỆU LỚP
   ========================================================= */

function normalizeClasses(rows) {

    return rows
        .map(row => {

            const className =
                getField(row, [

                    "Lớp",
                    "Lop",
                    "Tên lớp",
                    "Ten lop",
                    "CLASS",
                    "Class",
                    "class",
                    "MaLop",
                    "Mã lớp",
                    "Ma Lop"

                ]);


            const classId =
                getField(row, [

                    "Mã lớp",
                    "Ma lop",
                    "MaLop",
                    "ID",
                    "Id",
                    "id"

                ]);


            /*
               Nếu không có tên lớp,
               lấy giá trị đầu tiên của dòng.
            */

            let finalName =
                className;


            if (!finalName) {

                const values =
                    Object.values(row)
                        .map(clean)
                        .filter(Boolean);


                if (values.length > 0) {

                    finalName =
                        values[0];

                }

            }


            return {

                id: classId || finalName,

                name: finalName

            };

        })
        .filter(item => item.name);

}


/* =========================================================
   7. CHUYỂN DỮ LIỆU HỌC SINH
   ========================================================= */

function normalizeStudents(rows) {

    return rows.map(row => {

        return {

            id: getField(row, [

                "Mã HS",
                "Ma HS",
                "Mã học sinh",
                "Ma hoc sinh",
                "MaHS",
                "ID",
                "Id",
                "id"

            ]),

            name: getField(row, [

                "Họ và tên",
                "Ho va ten",
                "Họ tên",
                "Ho ten",
                "Tên học sinh",
                "Ten hoc sinh",
                "Name",
                "name"

            ]),

            className: getField(row, [

                "Lớp",
                "Lop",
                "Tên lớp",
                "Ten lop",
                "Class",
                "class"

            ]),

            gender: getField(row, [

                "Giới tính",
                "Gioi tinh",
                "Gender",
                "gender"

            ]),

            birthday: getField(row, [

                "Ngày sinh",
                "Ngay sinh",
                "Birthday",
                "birthday"

            ]),

            parent: getField(row, [

                "Phụ huynh",
                "Phu huynh",
                "Cha mẹ",
                "Cha me",
                "Parent",
                "parent"

            ]),

            phone: getField(row, [

                "SĐT",
                "SDT",
                "Số điện thoại",
                "So dien thoai",
                "Phone",
                "phone"

            ])

        };

    });

}


/* =========================================================
   8. CHUYỂN DỮ LIỆU ĐIỂM
   ========================================================= */

function normalizeScores(rows) {

    return rows.map(row => {

        return {

            studentId: getField(row, [

                "Mã HS",
                "Ma HS",
                "MaHS",
                "Mã học sinh",
                "Ma hoc sinh"

            ]),

            studentName: getField(row, [

                "Họ và tên",
                "Ho va ten",
                "Họ tên",
                "Ho ten",
                "Tên học sinh",
                "Ten hoc sinh"

            ]),

            className: getField(row, [

                "Lớp",
                "Lop",
                "Class",
                "class"

            ]),

            subject: getField(row, [

                "Môn",
                "Mon",
                "Môn học",
                "Mon hoc",
                "Subject",
                "subject"

            ]),

            score: getField(row, [

                "Điểm",
                "Diem",
                "Score",
                "score"

            ])

        };

    });

}


/* =========================================================
   9. CHUYỂN DỮ LIỆU THI ĐUA
   ========================================================= */

function normalizeCompetition(rows) {

    return rows.map(row => {

        return {

            className: getField(row, [

                "Lớp",
                "Lop",
                "Class",
                "class"

            ]),

            score: getField(row, [

                "Điểm",
                "Diem",
                "Điểm thi đua",
                "Diem thi dua",
                "Tổng điểm",
                "Tong diem",
                "Score",
                "score"

            ]),

            rank: getField(row, [

                "Xếp hạng",
                "Xep hang",
                "Hạng",
                "Hang",
                "Rank",
                "rank"

            ])

        };

    });

}


/* =========================================================
   10. CHUYỂN DỮ LIỆU ĐIỂM DANH
   ========================================================= */

function normalizeAttendance(rows) {

    return rows.map(row => {

        return {

            studentId: getField(row, [

                "Mã HS",
                "Ma HS",
                "MaHS",
                "Mã học sinh",
                "Ma hoc sinh"

            ]),

            studentName: getField(row, [

                "Họ và tên",
                "Ho va ten",
                "Họ tên",
                "Ho ten",
                "Tên học sinh",
                "Ten hoc sinh"

            ]),

            className: getField(row, [

                "Lớp",
                "Lop",
                "Class",
                "class"

            ]),

            status: getField(row, [

                "Trạng thái",
                "Trang thai",
                "Tình trạng",
                "Tinh trang",
                "Điểm danh",
                "Diem danh",
                "Status",
                "status"

            ]),

            date: getField(row, [

                "Ngày",
                "Ngay",
                "Ngày điểm danh",
                "Ngay diem danh",
                "Date",
                "date"

            ])

        };

    });

}


/* =========================================================
   11. HIỂN THỊ DANH SÁCH LỚP
   ========================================================= */

function renderClasses() {

    const select =
        $("classSelect");


    if (!select) return;


    select.innerHTML = "";


    if (!DATA.classes.length) {

        select.innerHTML = `
            <option value="">
                Không tìm thấy lớp
            </option>
        `;

        return;

    }


    select.innerHTML = `
        <option value="">
            -- Chọn lớp --
        </option>
    `;


    DATA.classes.forEach(
        (item, index) => {

            const option =
                document.createElement("option");


            option.value =
                item.name;


            option.textContent =
                item.name;


            select.appendChild(option);


            console.log(
                "Đã thêm lớp:",
                item.name
            );

        }
    );

}


/* =========================================================
   12. LỌC HỌC SINH THEO LỚP
   ========================================================= */

function getStudentsByClass(className) {

    if (!className) {

        return DATA.students;

    }


    const target =
        normalize(className);


    return DATA.students.filter(
        student =>
            normalize(
                student.className
            ) === target
    );

}


/* =========================================================
   13. HIỂN THỊ DANH SÁCH HỌC SINH
   ========================================================= */

function renderStudents() {

    const box =
        $("studentResults");


    if (!box) return;


    const searchInput =
        $("studentSearch");


    const keyword =
        normalize(
            searchInput
                ? searchInput.value
                : ""
        );


    let students =
        getStudentsByClass(
            selectedClass
        );


    if (keyword) {

        students =
            students.filter(
                student => {

                    return (

                        normalize(
                            student.id
                        ).includes(keyword)

                        ||

                        normalize(
                            student.name
                        ).includes(keyword)

                    );

                }
            );

    }


    $("totalStudents").textContent =
        students.length;


    if (!students.length) {

        box.innerHTML = `
            <p>
                Không tìm thấy học sinh.
            </p>
        `;

        return;

    }


    box.innerHTML =
        students.map(
            (student, index) => {

                return `

                    <div class="student-card">

                        <div class="student-name">

                            ${index + 1}.
                            ${escapeHTML(student.name || "Chưa có tên")}

                        </div>

                        <div class="student-code">

                            Mã HS:
                            ${escapeHTML(student.id || "—")}

                            ${student.gender
                                ? " • " +
                                  escapeHTML(student.gender)
                                : ""
                            }

                            ${student.birthday
                                ? " • " +
                                  escapeHTML(student.birthday)
                                : ""
                            }

                        </div>

                    </div>

                `;

            }
        ).join("");

}


/* =========================================================
   14. HIỂN THỊ ĐIỂM
   ========================================================= */

function renderScores() {

    const tbody =
        $("scoreTable");


    if (!tbody) return;


    let rows =
        DATA.scores;


    if (selectedClass) {

        const target =
            normalize(selectedClass);


        rows =
            rows.filter(
                item =>
                    !item.className ||
                    normalize(
                        item.className
                    ) === target
            );

    }


    if (!rows.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Chưa có dữ liệu điểm.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        rows.map(
            (item, index) => {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeHTML(item.studentId || "—")}
                        </td>

                        <td>
                            ${escapeHTML(item.studentName || "—")}
                        </td>

                        <td>
                            ${escapeHTML(item.subject || "—")}
                        </td>

                        <td>
                            <strong>
                                ${escapeHTML(item.score || "—")}
                            </strong>
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =========================================================
   15. HIỂN THỊ THI ĐUA
   ========================================================= */

function renderCompetition() {

    const tbody =
        $("competitionTable");


    if (!tbody) return;


    let rows =
        DATA.competition;


    if (selectedClass) {

        const target =
            normalize(selectedClass);


        rows =
            rows.filter(
                item =>
                    normalize(
                        item.className
                    ) === target
            );

    }


    if (!rows.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    Chưa có dữ liệu thi đua.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        rows.map(
            (item, index) => {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeHTML(item.className || "—")}
                        </td>

                        <td>
                            ${escapeHTML(item.score || "—")}
                        </td>

                        <td>
                            ${escapeHTML(item.rank || "—")}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =========================================================
   16. CHUYỂN TRẠNG THÁI ĐIỂM DANH
   ========================================================= */

function attendanceBadge(status) {

    const value =
        normalize(status);


    if (
        value.includes("co mat") ||
        value.includes("có mặt") ||
        value === "present"
    ) {

        return `
            <span class="badge badge-present">
                Có mặt
            </span>
        `;

    }


    if (
        value.includes("muon") ||
        value.includes("muộn") ||
        value === "late"
    ) {

        return `
            <span class="badge badge-late">
                Đi muộn
            </span>
        `;

    }


    if (
        value.includes("vang") ||
        value.includes("vắng") ||
        value === "absent"
    ) {

        return `
            <span class="badge badge-absent">
                Vắng
            </span>
        `;

    }


    return escapeHTML(
        status || "Chưa xác định"
    );

}


/* =========================================================
   17. HIỂN THỊ ĐIỂM DANH
   ========================================================= */

function renderAttendance() {

    const tbody =
        $("attendanceTable");


    if (!tbody) return;


    let rows =
        DATA.attendance;


    if (selectedClass) {

        const target =
            normalize(selectedClass);


        rows =
            rows.filter(
                item =>
                    !item.className ||
                    normalize(
                        item.className
                    ) === target
            );

    }


    /*
       Nếu người dùng chọn ngày,
       chỉ hiển thị ngày đó nếu dữ liệu
       có cột ngày.
    */

    const dateInput =
        $("attendanceDate");


    const selectedDate =
        dateInput
            ? dateInput.value
            : "";


    if (
        selectedDate &&
        rows.some(
            item => item.date
        )
    ) {

        const formatted =
            formatDateForCompare(
                selectedDate
            );


        rows =
            rows.filter(
                item =>
                    normalizeDate(
                        item.date
                    ) === formatted
            );

    }


    updateAttendanceStats(rows);


    if (!rows.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    Chưa có dữ liệu điểm danh.
                </td>
            </tr>
        `;

        return;

    }


    tbody.innerHTML =
        rows.map(
            (item, index) => {

                return `

                    <tr>

                        <td>
                            ${index + 1}
                        </td>

                        <td>
                            ${escapeHTML(item.studentId || "—")}
                        </td>

                        <td>
                            ${escapeHTML(item.studentName || "—")}
                        </td>

                        <td>
                            ${attendanceBadge(item.status)}
                        </td>

                        <td>
                            ${escapeHTML(item.date || "—")}
                        </td>

                    </tr>

                `;

            }
        ).join("");

}


/* =========================================================
   18. CHUẨN HÓA NGÀY
   ========================================================= */

function normalizeDate(value) {

    if (!value) return "";


    const text =
        clean(value);


    /*
       dd/mm/yyyy
    */

    let match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
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

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(text)
    ) {

        return text;

    }


    return normalize(text);

}


function formatDateForCompare(value) {

    return normalizeDate(value);

}


/* =========================================================
   19. THỐNG KÊ ĐIỂM DANH
   ========================================================= */

function updateAttendanceStats(rows) {

    let present = 0;

    let late = 0;

    let absent = 0;


    rows.forEach(item => {

        const value =
            normalize(item.status);


        if (
            value.includes("co mat") ||
            value === "present"
        ) {

            present++;

        }
        else if (
            value.includes("muon") ||
            value === "late"
        ) {

            late++;

        }
        else if (
            value.includes("vang") ||
            value === "absent"
        ) {

            absent++;

        }

    });


    const students =
        getStudentsByClass(
            selectedClass
        );


    $("totalStudents").textContent =
        students.length;


    $("presentStudents").textContent =
        present;


    $("lateStudents").textContent =
        late;


    $("absentStudents").textContent =
        absent;

}


/* =========================================================
   20. KHI CHỌN LỚP
   ========================================================= */

function onClassChanged() {

    const select =
        $("classSelect");


    selectedClass =
        select
            ? select.value
            : "";


    console.log(
        "Đã chọn lớp:",
        selectedClass
    );


    renderStudents();

    renderScores();

    renderCompetition();

    renderAttendance();

}


/* =========================================================
   21. TÌM KIẾM HỌC SINH
   ========================================================= */

function onSearchStudent() {

    renderStudents();

}


/* =========================================================
   22. TẢI TOÀN BỘ DỮ LIỆU
   ========================================================= */

async function loadAllData() {

    try {

        showMessage(
            "⏳ Đang tải dữ liệu từ Google Sheets...",
            "loading"
        );


        console.log(
            "========== BẮT ĐẦU TẢI DỮ LIỆU =========="
        );


        /*
           Tải song song 5 sheet
        */

        const [

            classData,

            studentData,

            scoreData,

            competitionData,

            attendanceData

        ] = await Promise.all([

            fetchSheet(
                CONFIG.sheets.classes
            ),

            fetchSheet(
                CONFIG.sheets.students
            ),

            fetchSheet(
                CONFIG.sheets.scores
            ),

            fetchSheet(
                CONFIG.sheets.competition
            ),

            fetchSheet(
                CONFIG.sheets.attendance
            )

        ]);


        /*
           Chuyển dữ liệu
        */

        DATA.classes =
            normalizeClasses(
                classData.rows
            );


        DATA.students =
            normalizeStudents(
                studentData.rows
            );


        DATA.scores =
            normalizeScores(
                scoreData.rows
            );


        DATA.competition =
            normalizeCompetition(
                competitionData.rows
            );


        DATA.attendance =
            normalizeAttendance(
                attendanceData.rows
            );


        console.log(
            "Dữ liệu lớp:",
            DATA.classes
        );


        console.log(
            "Dữ liệu học sinh:",
            DATA.students
        );


        console.log(
            "Dữ liệu điểm:",
            DATA.scores
        );


        console.log(
            "Dữ liệu thi đua:",
            DATA.competition
        );


        console.log(
            "Dữ liệu điểm danh:",
            DATA.attendance
        );


        console.log(
            "Số lớp:",
            DATA.classes.length
        );


        console.log(
            "Số học sinh:",
            DATA.students.length
        );


        /*
           Hiển thị
        */

        renderClasses();

        renderStudents();

        renderScores();

        renderCompetition();

        renderAttendance();


        hideMessage();


        console.log(
            "========== ĐÃ TẢI XONG TOÀN BỘ DỮ LIỆU =========="
        );

    }
    catch (error) {

        console.error(
            "LỖI TẢI DỮ LIỆU:",
            error
        );


        showMessage(
            "❌ Lỗi tải dữ liệu: " +
            error.message,
            "error"
        );

    }

}


/* =========================================================
   23. CAMERA
   ========================================================= */

async function startCamera() {

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            alert(
                "Trình duyệt không hỗ trợ camera."
            );

            return;

        }


        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: "user"

                },

                audio: false

            });


        $("camera").srcObject =
            cameraStream;


        $("cameraBox").style.display =
            "block";


        $("showCamera").style.display =
            "none";


    }
    catch (error) {

        console.error(
            "Lỗi camera:",
            error
        );


        alert(
            "Không thể mở camera.\n\n" +
            "Hãy cho phép trình duyệt sử dụng camera."
        );

    }

}


function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );


        cameraStream = null;

    }


    if ($("camera")) {

        $("camera").srcObject =
            null;

    }


    $("cameraBox").style.display =
        "none";


    $("showCamera").style.display =
        "block";

}


/* =========================================================
   24. ĐẶT NGÀY HIỆN TẠI
   ========================================================= */

function setToday() {

    const input =
        $("attendanceDate");


    if (!input) return;


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    input.value =
        `${year}-${month}-${day}`;

}


/* =========================================================
   25. GẮN SỰ KIỆN
   ========================================================= */

function bindEvents() {


    $("classSelect")
        ?.addEventListener(
            "change",
            onClassChanged
        );


    $("studentSearch")
        ?.addEventListener(
            "input",
            onSearchStudent
        );


    $("attendanceDate")
        ?.addEventListener(
            "change",
            renderAttendance
        );


    $("reloadButton")
        ?.addEventListener(
            "click",
            loadAllData
        );


    $("showCamera")
        ?.addEventListener(
            "click",
            startCamera
        );


    $("startCamera")
        ?.addEventListener(
            "click",
            startCamera
        );


    $("stopCamera")
        ?.addEventListener(
            "click",
            stopCamera
        );

}


/* =========================================================
   26. KHỞI ĐỘNG ỨNG DỤNG
   ========================================================= */

async function initApp() {

    console.log(
        "Ứng dụng bắt đầu..."
    );


    setToday();


    bindEvents();


    await loadAllData();

}


/* =========================================================
   27. CHẠY ỨNG DỤNG
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initApp
);

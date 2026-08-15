"use strict";


/*
============================================================
 TRỢ LÝ AI - QUẢN LÝ LỚP HỌC
============================================================

 GOOGLE SHEETS

 Spreadsheet ID:

 1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU


 CÁC SHEET:

 LOP
 HOCSINH
 DIEM
 THIDUA
 DIEMDANH

============================================================
*/


// ==========================================================
// 1. CẤU HÌNH
// ==========================================================

const CONFIG = {

    SPREADSHEET_ID:
        "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU",

    SHEETS: {

        CLASSES:
            "LOP",

        STUDENTS:
            "HOCSINH",

        SCORES:
            "DIEM",

        COMPETITION:
            "THIDUA",

        ATTENDANCE:
            "DIEMDANH"

    },

    /*
    ========================================================
    SAU NÀY SẼ DÙNG ĐỂ GHI DỮ LIỆU VÀO GOOGLE SHEETS

    Hiện tại để trống.

    ========================================================
    */

    APPS_SCRIPT_URL: ""

};


// ==========================================================
// 2. BIẾN TOÀN CỤC
// ==========================================================

let classes = [];

let students = [];

let scores = [];

let competitions = [];

let attendances = [];


let selectedClassId = "";

let selectedDate = "";

let selectedStudentId = "";


let videoStream = null;


// ==========================================================
// 3. HÀM TIỆN ÍCH
// ==========================================================

function log(...args) {

    console.log(
        "[APP]",
        ...args
    );

}



function showStatus(
    message,
    type = "info"
) {

    const box =
        document.getElementById(
            "statusBox"
        );

    if (!box) return;


    box.textContent =
        message;


    box.className =
        "status show";


    if (type === "success") {

        box.classList.add(
            "success"
        );

    }


    if (type === "error") {

        box.classList.add(
            "error"
        );

    }

}



function clearStatus() {

    const box =
        document.getElementById(
            "statusBox"
        );

    if (!box) return;


    box.textContent = "";

    box.className =
        "status";

}



function todayISO() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}



function normalizeDate(value) {

    if (!value) return "";


    const text =
        String(value)
            .trim();


    /*
    YYYY-MM-DD
    */

    if (
        /^\d{4}-\d{2}-\d{2}$/
            .test(text)
    ) {

        return text;

    }


    /*
    DD/MM/YYYY
    */

    let match =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        );


    if (match) {

        return (
            match[3] +
            "-" +
            String(match[2])
                .padStart(2, "0") +
            "-" +
            String(match[1])
                .padStart(2, "0")
        );

    }


    return text;

}



function formatDate(value) {

    const date =
        normalizeDate(
            value
        );


    if (!date) return "";


    const parts =
        date.split("-");


    if (
        parts.length === 3
    ) {

        return (
            parts[2] +
            "/" +
            parts[1] +
            "/" +
            parts[0]
        );

    }


    return value;

}



function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}



function numberOrZero(value) {

    const number =
        Number(value);


    if (
        Number.isFinite(number)
    ) {

        return number;

    }


    return 0;

}



// ==========================================================
// 4. ĐỌC GOOGLE SHEETS
// ==========================================================

async function fetchSheet(
    sheetName
) {

    const url =

        "https://docs.google.com/spreadsheets/d/" +

        CONFIG.SPREADSHEET_ID +

        "/gviz/tq?tqx=out:json&sheet=" +

        encodeURIComponent(
            sheetName
        );


    log(
        "Đang đọc Sheet:",
        sheetName
    );


    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(

            "Không đọc được Sheet " +

            sheetName +

            ". HTTP " +

            response.status

        );

    }


    const text =
        await response.text();


    const start =
        text.indexOf("{");


    const end =
        text.lastIndexOf("}");


    if (
        start === -1 ||
        end === -1
    ) {

        throw new Error(

            "Google Sheets không trả về dữ liệu."

        );

    }


    const json =
        JSON.parse(
            text.substring(
                start,
                end + 1
            )
        );


    if (
        json.status === "error"
    ) {

        throw new Error(

            "Google Sheets trả về lỗi."

        );

    }


    const columns =
        (
            json.table.cols || []
        ).map(
            column =>
                column.label || ""
        );


    const rows =
        (
            json.table.rows || []
        ).map(
            row => {

                const object = {};


                columns.forEach(
                    (
                        column,
                        index
                    ) => {

                        if (!column)
                            return;


                        const cell =
                            row.c?.[index];


                        object[column] =
                            cell
                                ? (
                                    cell.v ??
                                    ""
                                )
                                : "";

                    }
                );


                return object;

            }
        );


    log(
        "Đã đọc",
        sheetName,
        rows.length,
        "dòng"
    );


    return rows;

}



// ==========================================================
// 5. TẢI TOÀN BỘ DỮ LIỆU
// ==========================================================

async function loadAllData() {

    showStatus(
        "⏳ Đang tải dữ liệu từ Google Sheets..."
    );


    try {

        const result =
            await Promise.all([

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

            ]);


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


        renderClasses();


        if (
            !selectedClassId &&
            classes.length
        ) {

            selectedClassId =
                String(
                    classes[0].Malop
                );

        }


        document
            .getElementById(
                "classSelect"
            )
            .value =
                selectedClassId;


        renderStudents();

        renderAttendance();

        updateStatistics();


        showStatus(

            "✅ Đã tải xong " +

            classes.length +

            " lớp và " +

            students.length +

            " học sinh.",

            "success"

        );


        setTimeout(
            clearStatus,
            4000
        );


    }

    catch (error) {

        console.error(
            error
        );


        showStatus(

            "❌ Lỗi tải dữ liệu: " +

            error.message,

            "error"

        );

    }

}



// ==========================================================
// 6. HIỂN THỊ DANH SÁCH LỚP
// ==========================================================

function renderClasses() {

    const select =
        document.getElementById(
            "classSelect"
        );


    select.innerHTML = "";


    if (
        !classes.length
    ) {

        select.innerHTML =
            `<option>Không có lớp</option>`;

        return;

    }


    classes.forEach(
        cls => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                cls.Malop;


            option.textContent =

                (
                    cls.TenLop ||
                    cls.Malop
                ) +

                (
                    cls.GVCN
                        ? " - GVCN: " +
                          cls.GVCN
                        : ""
                );


            select.appendChild(
                option
            );

        }
    );


    select.value =
        selectedClassId;

}



// ==========================================================
// 7. LỌC HỌC SINH
// ==========================================================

function getCurrentStudents() {

    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .trim()
            .toLowerCase();


    return students.filter(
        student => {

            if (
                String(
                    student.MaLop
                ) !==
                String(
                    selectedClassId
                )
            ) {

                return false;

            }


            if (!search)
                return true;


            const code =
                String(
                    student.MaHS
                )
                .toLowerCase();


            const name =
                String(
                    student.HoTen
                )
                .toLowerCase();


            return (

                code.includes(
                    search
                ) ||

                name.includes(
                    search
                )

            );

        }
    );

}



// ==========================================================
// 8. ĐIỂM TRUNG BÌNH
// ==========================================================

function getAverageScore(
    studentId
) {

    const row =
        scores.find(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    studentId
                )
        );


    if (!row)
        return null;


    const values = [

        row.TX1,

        row.TX2,

        row.TX3,

        row.TX4

    ]
        .map(
            value =>
                Number(value)
        )
        .filter(
            value =>
                Number.isFinite(
                    value
                )
        );


    if (!values.length)
        return null;


    return (

        values.reduce(
            (
                total,
                value
            ) =>
                total + value,
            0
        ) /

        values.length

    );

}



// ==========================================================
// 9. ĐIỂM THI ĐUA
// ==========================================================

function getCompetitionScore(
    studentId
) {

    return competitions

        .filter(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    studentId
                )
        )

        .reduce(
            (
                total,
                item
            ) =>

                total +
                numberOrZero(
                    item.Diem
                ),

            0
        );

}



// ==========================================================
// 10. ĐIỂM DANH
// ==========================================================

function getAttendance(
    studentId
) {

    const list =
        attendances.filter(
            item =>

                String(
                    item.MaHS
                ) ===
                String(
                    studentId
                )

                &&

                normalizeDate(
                    item.Ngay
                ) ===
                normalizeDate(
                    selectedDate
                )
        );


    if (!list.length) {

        return {

            status:
                "Chưa xác định",

            note:
                ""

        };

    }


    return {

        status:
            list[
                list.length - 1
            ].Trangthai ||
            "Chưa xác định",

        note:
            list[
                list.length - 1
            ].Ghichu ||
            ""

    };

}



// ==========================================================
// 11. BADGE
// ==========================================================

function attendanceBadge(
    status
) {

    let className =
        "badge-unknown";


    if (
        status ===
        "Có mặt"
    ) {

        className =
            "badge-present";

    }


    if (
        status ===
        "Đi muộn"
    ) {

        className =
            "badge-late";

    }


    if (
        status ===
        "Vắng"
    ) {

        className =
            "badge-absent";

    }


    if (
        status ===
        "Cần xác nhận"
    ) {

        className =
            "badge-confirm";

    }


    return `

        <span
            class="badge ${className}"
        >
            ${escapeHTML(status)}
        </span>

    `;

}



// ==========================================================
// 12. HIỂN THỊ HỌC SINH
// ==========================================================

function renderStudents() {

    const tbody =
        document.getElementById(
            "studentTableBody"
        );


    const list =
        getCurrentStudents();


    if (!list.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    class="empty"
                >
                    Không có học sinh.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        list.map(
            (
                student,
                index
            ) => {


                const average =
                    getAverageScore(
                        student.MaHS
                    );


                const competition =
                    getCompetitionScore(
                        student.MaHS
                    );


                const attendance =
                    getAttendance(
                        student.MaHS
                    );


                return `

                <tr>

                    <td>
                        ${
                            escapeHTML(
                                student.STT ||
                                index + 1
                            )
                        }
                    </td>


                    <td>
                        ${escapeHTML(
                            student.MaHS
                        )}
                    </td>


                    <td>

                        <div
                            class="student-name"
                        >
                            ${escapeHTML(
                                student.HoTen
                            )}
                        </div>

                    </td>


                    <td>
                        ${escapeHTML(
                            student.Gioitinh
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            formatDate(
                                student.NgaySinh
                            )
                        )}
                    </td>


                    <td>

                        ${
                            average === null

                            ? "-"

                            : average.toFixed(2)

                        }

                    </td>


                    <td>

                        ${
                            competition > 0
                            ? "+"
                            : ""
                        }

                        ${competition}

                    </td>


                    <td>

                        ${
                            attendanceBadge(
                                attendance.status
                            )
                        }

                    </td>


                    <td>

                        <button
                            class="btn-primary"
                            onclick="selectStudent('${escapeHTML(student.MaHS)}')"
                        >
                            Xem
                        </button>

                    </td>

                </tr>

                `;

            }
        )
        .join("");

}



// ==========================================================
// 13. HIỂN THỊ ĐIỂM DANH
// ==========================================================

function renderAttendance() {

    const tbody =
        document.getElementById(
            "attendanceTableBody"
        );


    const list =
        students.filter(
            student =>
                String(
                    student.MaLop
                ) ===
                String(
                    selectedClassId
                )
        );


    if (!list.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="4"
                    class="empty"
                >
                    Không có học sinh.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        list.map(
            student => {

                const attendance =
                    getAttendance(
                        student.MaHS
                    );


                return `

                <tr>

                    <td>
                        ${escapeHTML(
                            student.MaHS
                        )}
                    </td>


                    <td>
                        ${escapeHTML(
                            student.HoTen
                        )}
                    </td>


                    <td>
                        ${
                            attendanceBadge(
                                attendance.status
                            )
                        }
                    </td>


                    <td>
                        ${escapeHTML(
                            attendance.note
                        )}
                    </td>

                </tr>

                `;

            }
        )
        .join("");

}



// ==========================================================
// 14. THỐNG KÊ
// ==========================================================

function updateStatistics() {

    const list =
        students.filter(
            student =>
                String(
                    student.MaLop
                ) ===
                String(
                    selectedClassId
                )
        );


    let present = 0;

    let late = 0;

    let absent = 0;

    let confirm = 0;


    list.forEach(
        student => {

            const status =
                getAttendance(
                    student.MaHS
                ).status;


            if (
                status ===
                "Có mặt"
            ) {

                present++;

            }

            else if (
                status ===
                "Đi muộn"
            ) {

                late++;

            }

            else if (
                status ===
                "Vắng"
            ) {

                absent++;

            }

            else if (
                status ===
                "Cần xác nhận"
            ) {

                confirm++;

            }

        }
    );


    document
        .getElementById(
            "statTotal"
        )
        .textContent =
            list.length;


    document
        .getElementById(
            "statPresent"
        )
        .textContent =
            present;


    document
        .getElementById(
            "statLate"
        )
        .textContent =
            late;


    document
        .getElementById(
            "statAbsent"
        )
        .textContent =
            absent;


    document
        .getElementById(
            "statConfirm"
        )
        .textContent =
            confirm;

}



// ==========================================================
// 15. CHỌN HỌC SINH
// ==========================================================

function selectStudent(
    studentId
) {

    selectedStudentId =
        studentId;


    const student =
        students.find(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    studentId
                )
        );


    if (!student)
        return;


    const box =
        document.getElementById(
            "selectedStudentBox"
        );


    box.innerHTML = `

        <div class="selected-student">

            <h3>
                ${escapeHTML(
                    student.HoTen
                )}
            </h3>

            <p>
                <strong>Mã HS:</strong>
                ${escapeHTML(
                    student.MaHS
                )}
            </p>

            <p>
                <strong>Lớp:</strong>
                ${escapeHTML(
                    student.MaLop
                )}
            </p>


            <div
                class="attendance-buttons"
            >

                <button
                    class="btn-success"
                    onclick="manualAttendance('Có mặt')"
                >
                    🟢 Có mặt
                </button>


                <button
                    class="btn-warning"
                    onclick="manualAttendance('Đi muộn')"
                >
                    🟡 Đi muộn
                </button>


                <button
                    class="btn-danger"
                    onclick="manualAttendance('Vắng')"
                >
                    🔴 Vắng
                </button>


                <button
                    class="btn-secondary"
                    onclick="manualAttendance('Cần xác nhận')"
                >
                    ⚠️ Cần xác nhận
                </button>

            </div>

        </div>

    `;


    renderScore(
        student
    );


    renderCompetition(
        student
    );

}


window.selectStudent =
    selectStudent;



// ==========================================================
// 16. HIỂN THỊ ĐIỂM
// ==========================================================

function renderScore(
    student
) {

    const box =
        document.getElementById(
            "scoreDetail"
        );


    const row =
        scores.find(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    student.MaHS
                )
        );


    if (!row) {

        box.innerHTML =
            "Chưa có dữ liệu điểm.";

        return;

    }


    const average =
        getAverageScore(
            student.MaHS
        );


    box.innerHTML = `

        <table>

            <tr>

                <th>
                    Học sinh
                </th>

                <td>
                    ${escapeHTML(
                        student.HoTen
                    )}
                </td>

            </tr>


            <tr>

                <th>
                    TX1
                </th>

                <td>
                    ${escapeHTML(
                        row.TX1
                    )}
                </td>

            </tr>


            <tr>

                <th>
                    TX2
                </th>

                <td>
                    ${escapeHTML(
                        row.TX2
                    )}
                </td>

            </tr>


            <tr>

                <th>
                    TX3
                </th>

                <td>
                    ${escapeHTML(
                        row.TX3
                    )}
                </td>

            </tr>


            <tr>

                <th>
                    TX4
                </th>

                <td>
                    ${escapeHTML(
                        row.TX4
                    )}
                </td>

            </tr>


            <tr>

                <th>
                    Điểm TB
                </th>

                <td>

                    <strong>

                        ${
                            average === null
                            ? "-"
                            : average.toFixed(2)
                        }

                    </strong>

                </td>

            </tr>

        </table>

    `;

}



// ==========================================================
// 17. HIỂN THỊ THI ĐUA
// ==========================================================

function renderCompetition(
    student
) {

    const box =
        document.getElementById(
            "competitionDetail"
        );


    const rows =
        competitions.filter(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    student.MaHS
                )
        );


    const total =
        getCompetitionScore(
            student.MaHS
        );


    if (!rows.length) {

        box.innerHTML = `

            <p>
                Chưa có dữ liệu thi đua.
            </p>

            <p>
                <strong>
                    Tổng điểm: ${total}
                </strong>
            </p>

        `;

        return;

    }


    box.innerHTML = `

        <table>

            <thead>

                <tr>

                    <th>
                        Ngày
                    </th>

                    <th>
                        Loại
                    </th>

                    <th>
                        Nội dung
                    </th>

                    <th>
                        Điểm
                    </th>

                </tr>

            </thead>


            <tbody>

                ${
                    rows.map(
                        row => `

                            <tr>

                                <td>
                                    ${escapeHTML(
                                        formatDate(
                                            row.Ngay
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.Loai
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        row.NoiDung
                                    )}
                                </td>

                                <td>
                                    ${numberOrZero(
                                        row.Diem
                                    )}
                                </td>

                            </tr>

                        `
                    ).join("")
                }

            </tbody>

        </table>


        <p>

            <strong>
                Tổng điểm thi đua:
                ${total}
            </strong>

        </p>

    `;

}



// ==========================================================
// 18. ĐIỂM DANH THỦ CÔNG
// ==========================================================

async function manualAttendance(
    status
) {

    if (!selectedStudentId) {

        showStatus(
            "⚠️ Hãy chọn học sinh trước.",
            "error"
        );

        return;

    }


    const student =
        students.find(
            item =>
                String(
                    item.MaHS
                ) ===
                String(
                    selectedStudentId
                )
        );


    if (!student)
        return;


    /*
    ================================================
    NẾU CHƯA CÓ GOOGLE APPS SCRIPT
    ================================================
    */

    if (
        !CONFIG.APPS_SCRIPT_URL
    ) {

        const existing =
            attendances.find(
                item =>

                    String(
                        item.MaHS
                    ) ===
                    String(
                        selectedStudentId
                    )

                    &&

                    normalizeDate(
                        item.Ngay
                    ) ===
                    normalizeDate(
                        selectedDate
                    )
            );


        if (existing) {

            existing.Trangthai =
                status;

            existing.Ghichu =
                "Giáo viên xác nhận";

        }

        else {

            attendances.push({

                ID:
                    "TEMP-" +
                    Date.now(),

                MaHS:
                    selectedStudentId,

                MaLop:
                    selectedClassId,

                Ngay:
                    selectedDate,

                Trangthai:
                    status,

                Ghichu:
                    "Giáo viên xác nhận"

            });

        }


        renderStudents();

        renderAttendance();

        updateStatistics();


        showStatus(

            "✅ Đã cập nhật " +

            student.HoTen +

            ": " +

            status +

            " (tạm thời)",

            "success"

        );


        return;

    }


    /*
    ================================================
    NẾU ĐÃ CÓ APPS SCRIPT
    ================================================
    */

    try {

        const response =
            await fetch(
                CONFIG.APPS_SCRIPT_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify({

                            action:
                                "attendance",

                            MaHS:
                                selectedStudentId,

                            MaLop:
                                selectedClassId,

                            Ngay:
                                selectedDate,

                            Trangthai:
                                status,

                            Ghichu:
                                "Giáo viên xác nhận"

                        })

                }
            );


        const result =
            await response.text();


        console.log(
            "Apps Script:",
            result
        );


        showStatus(
            "✅ Đã lưu điểm danh.",
            "success"
        );


        await loadAllData();

    }

    catch (error) {

        console.error(
            error
        );


        showStatus(

            "❌ Không lưu được: " +
            error.message,

            "error"

        );

    }

}


// ==========================================================
// 19. CAMERA
// ==========================================================

async function startCamera() {

    const video =
        document.getElementById(
            "video"
        );


    const placeholder =
        document.getElementById(
            "cameraPlaceholder"
        );


    const status =
        document.getElementById(
            "cameraStatus"
        );


    const capture =
        document.getElementById(
            "captureBtn"
        );


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        status.textContent =
            "🔴 Trình duyệt không hỗ trợ camera.";

        return;

    }


    try {

        log(
            "Đang bật camera..."
        );


        videoStream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video: {

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        },

                        facingMode:
                            "user"

                    },

                    audio: false

                });


        video.srcObject =
            videoStream;


        placeholder.style.display =
            "none";


        capture.disabled =
            false;


        status.textContent =
            "🟢 Camera đang hoạt động";


        console.log(
            "Camera đã bật thành công"
        );

    }

    catch (error) {

        console.error(
            error
        );


        status.textContent =

            "🔴 Không thể mở camera: " +

            error.message;

    }

}



function stopCamera() {

    const video =
        document.getElementById(
            "video"
        );


    const placeholder =
        document.getElementById(
            "cameraPlaceholder"
        );


    const status =
        document.getElementById(
            "cameraStatus"
        );


    const capture =
        document.getElementById(
            "captureBtn"
        );


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


    video.srcObject =
        null;


    placeholder.style.display =
        "block";


    capture.disabled =
        true;


    status.textContent =
        "⚪ Camera đã tắt";

}



// ==========================================================
// 20. CHỤP ẢNH KIỂM TRA
// ==========================================================

function captureFrame() {

    const video =
        document.getElementById(
            "video"
        );


    if (
        !videoStream
    ) {

        showStatus(
            "⚠️ Camera chưa được bật.",
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


    const context =
        canvas.getContext(
            "2d"
        );


    context.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );


    console.log(
        "Đã chụp:",
        canvas.width,
        "x",
        canvas.height
    );


    showStatus(

        "📸 Đã chụp khung hình camera.",

        "success"

    );

}



// ==========================================================
// 21. SỰ KIỆN
// ==========================================================

function setupEvents() {


    // Chọn lớp

    document
        .getElementById(
            "classSelect"
        )
        .addEventListener(
            "change",
            function () {

                selectedClassId =
                    this.value;


                renderStudents();

                renderAttendance();

                updateStatistics();

            }
        );


    // Tìm kiếm

    document
        .getElementById(
            "searchInput"
        )
        .addEventListener(
            "input",
            function () {

                renderStudents();

            }
        );


    // Ngày

    document
        .getElementById(
            "attendanceDate"
        )
        .addEventListener(
            "change",
            function () {

                selectedDate =
                    this.value;


                renderStudents();

                renderAttendance();

                updateStatistics();

            }
        );


    // Tải lại

    document
        .getElementById(
            "reloadBtn"
        )
        .addEventListener(
            "click",
            loadAllData
        );


    // Camera

    document
        .getElementById(
            "startCameraBtn"
        )
        .addEventListener(
            "click",
            startCamera
        );


    document
        .getElementById(
            "stopCameraBtn"
        )
        .addEventListener(
            "click",
            stopCamera
        );


    document
        .getElementById(
            "captureBtn"
        )
        .addEventListener(
            "click",
            captureFrame
        );


    // Đóng camera khi thoát

    window.addEventListener(
        "beforeunload",
        stopCamera
    );

}



// ==========================================================
// 22. KHỞI ĐỘNG
// ==========================================================

async function initApp() {

    console.log(
        "Ứng dụng bắt đầu..."
    );


    selectedDate =
        todayISO();


    document
        .getElementById(
            "attendanceDate"
        )
        .value =
            selectedDate;


    setupEvents();


    await loadAllData();


    console.log(
        "ĐÃ TẢI XONG TOÀN BỘ DỮ LIỆU"
    );

}



// ==========================================================
// 23. CHẠY
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    initApp
);

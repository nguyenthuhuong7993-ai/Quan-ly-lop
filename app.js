/* =========================================================
   TRỢ LÝ AI – QUẢN LÝ LỚP HỌC
   app.js
   ========================================================= */


/* =========================================================
   1. CẤU HÌNH GOOGLE SHEETS
   ========================================================= */

const CONFIG = {

    spreadsheetId:
        "1H15_JVJ3jXKnzNxxhfk-T_0UlK0uo-aMslG5MeZo3EU",

    sheets: {

        lop: "LOP",

        hocSinh: "HOCSINH",

        diem: "DIEM",

        thiDua: "THIDUA",

        diemDanh: "DIEMDANH"

    }

};


/* =========================================================
   2. BIẾN DỮ LIỆU
   ========================================================= */

let DATA = {

    lop: [],

    hocSinh: [],

    diem: [],

    thiDua: [],

    diemDanh: []

};


let selectedClass = "";

let cameraStream = null;


/* =========================================================
   3. HÀM TIỆN ÍCH
   ========================================================= */


/*
   Chuẩn hóa tên cột.

   Ví dụ:

   "MaHS"       → "mahs"
   "Mã HS"      → "mahs"
   "Họ và tên"  → "hoten"
   "TenLop"     → "tenlop"
*/

function normalizeKey(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

}


/*
   Lấy giá trị theo nhiều tên cột có thể có.
*/

function getValue(row, names, fallback = "") {

    if (!row) {
        return fallback;
    }

    const keys = Object.keys(row);

    for (const name of names) {

        const target =
            normalizeKey(name);

        const found =
            keys.find(
                key =>
                    normalizeKey(key) === target
            );

        if (found !== undefined) {

            const value =
                row[found];

            if (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ) {
                return value;
            }

        }

    }

    return fallback;
}


/*
   Chuyển giá trị thành chuỗi.
*/

function text(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();

}


/*
   Chuyển số.
*/

function numberValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const n =
        Number(
            String(value)
                .replace(",", ".")
        );

    return Number.isFinite(n)
        ? n
        : null;

}


/*
   Escape HTML để tránh lỗi khi dữ liệu
   Google Sheet có ký tự đặc biệt.
*/

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   4. THÔNG BÁO
   ========================================================= */

function showAlert(message, type = "info") {

    const alert =
        document.getElementById("alert");

    if (!alert) {
        return;
    }

    alert.className =
        "alert " + type;

    alert.textContent =
        message;

}


function hideAlert() {

    const alert =
        document.getElementById("alert");

    if (!alert) {
        return;
    }

    alert.className =
        "alert";

    alert.textContent =
        "";

}


/* =========================================================
   5. LOADING
   ========================================================= */

function showLoading() {

    const element =
        document.getElementById("loading");

    if (element) {
        element.classList.add("show");
    }

}


function hideLoading() {

    const element =
        document.getElementById("loading");

    if (element) {
        element.classList.remove("show");
    }

}


/* =========================================================
   6. ĐỌC GOOGLE SHEETS
   ========================================================= */


/*
   Google Visualization API.

   Không dùng /edit.

   Dạng:

   /gviz/tq?tqx=out:json&sheet=LOP

   Đây là cách phù hợp để đọc Sheet công khai.
*/


async function fetchSheet(sheetName) {

    const url =
        "https://docs.google.com/spreadsheets/d/" +
        CONFIG.spreadsheetId +
        "/gviz/tq?" +
        "tqx=out:json" +
        "&headers=1" +
        "&sheet=" +
        encodeURIComponent(sheetName);


    console.log(
        "Đang tải Sheet:",
        sheetName
    );

    console.log(
        "URL:",
        url
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
            "Google Sheets trả về HTTP " +
            response.status +
            " cho Sheet " +
            sheetName
        );

    }


    const raw =
        await response.text();


    /*
       Google trả về:

       google.visualization.Query.setResponse({...});
    */

    const start =
        raw.indexOf("(");

    const end =
        raw.lastIndexOf(")");


    if (
        start === -1 ||
        end === -1
    ) {

        console.error(
            "Phản hồi Google:",
            raw
        );

        throw new Error(
            "Không đọc được dữ liệu JSON từ Google Sheets."
        );

    }


    const jsonText =
        raw.substring(
            start + 1,
            end
        );


    let json;

    try {

        json =
            JSON.parse(jsonText);

    }
    catch (error) {

        console.error(
            "JSON lỗi:",
            jsonText
        );

        throw new Error(
            "Google Sheets không trả về dữ liệu hợp lệ."
        );

    }


    if (
        !json.table ||
        !json.table.cols
    ) {

        throw new Error(
            "Sheet " +
            sheetName +
            " không có dữ liệu."
        );

    }


    const columns =
        json.table.cols.map(
            (column, index) => {

                return (
                    column.label ||
                    column.id ||
                    "Column" + index
                );

            }
        );


    const rows =
        json.table.rows || [];


    const result =
        rows.map(row => {

            const object = {};

            columns.forEach(
                (column, index) => {

                    const cell =
                        row.c &&
                        row.c[index];

                    object[column] =
                        cell
                            ? (
                                cell.f ??
                                cell.v ??
                                ""
                            )
                            : "";

                }
            );

            return object;

        });


    console.log(
        "Sheet",
        sheetName,
        ":",
        result
    );


    return result;

}


/* =========================================================
   7. TẢI TOÀN BỘ DỮ LIỆU
   ========================================================= */

async function loadAllData() {

    showLoading();

    hideAlert();


    try {

        console.log(
            "================================="
        );

        console.log(
            "ĐANG TẢI TOÀN BỘ DỮ LIỆU"
        );

        console.log(
            "================================="
        );


        const [
            lop,
            hocSinh,
            diem,
            thiDua,
            diemDanh
        ] = await Promise.all([

            fetchSheet(
                CONFIG.sheets.lop
            ),

            fetchSheet(
                CONFIG.sheets.hocSinh
            ),

            fetchSheet(
                CONFIG.sheets.diem
            ),

            fetchSheet(
                CONFIG.sheets.thiDua
            ),

            fetchSheet(
                CONFIG.sheets.diemDanh
            )

        ]);


        DATA.lop =
            lop || [];

        DATA.hocSinh =
            hocSinh || [];

        DATA.diem =
            diem || [];

        DATA.thiDua =
            thiDua || [];

        DATA.diemDanh =
            diemDanh || [];


        console.log(
            "Dữ liệu lớp:",
            DATA.lop
        );

        console.log(
            "Dữ liệu học sinh:",
            DATA.hocSinh
        );

        console.log(
            "Dữ liệu điểm:",
            DATA.diem
        );

        console.log(
            "Dữ liệu thi đua:",
            DATA.thiDua
        );

        console.log(
            "Dữ liệu điểm danh:",
            DATA.diemDanh
        );


        console.log(
            "Số lớp:",
            DATA.lop.length
        );

        console.log(
            "Số học sinh:",
            DATA.hocSinh.length
        );


        fillClassSelect();


        renderAll();


        hideLoading();


        showAlert(
            "Đã tải dữ liệu thành công.",
            "success"
        );


        setTimeout(
            hideAlert,
            2500
        );

    }
    catch (error) {

        console.error(
            "LỖI TẢI DỮ LIỆU:",
            error
        );


        hideLoading();


        showAlert(
            "❌ Lỗi tải dữ liệu: " +
            error.message,
            "error"
        );

    }

}


/* =========================================================
   8. DANH SÁCH LỚP
   ========================================================= */

function fillClassSelect() {

    const select =
        document.getElementById(
            "classSelect"
        );

    if (!select) {
        return;
    }


    select.innerHTML =
        "";


    if (
        !DATA.lop ||
        DATA.lop.length === 0
    ) {

        select.innerHTML =
            `
            <option value="">
                Không có lớp
            </option>
            `;

        return;

    }


    /*
       Loại bỏ lớp trùng.
    */

    const classes = [];


    DATA.lop.forEach(row => {

        const maLop =
            text(
                getValue(
                    row,
                    [
                        "Malop",
                        "MaLop",
                        "Mã lớp",
                        "malop"
                    ]
                )
            );


        const tenLop =
            text(
                getValue(
                    row,
                    [
                        "TenLop",
                        "Tên lớp",
                        "Lop",
                        "Lớp",
                        "tenlop"
                    ]
                )
            );


        /*
           Nếu TenLop rỗng,
           dùng Malop.
        */

        const display =
            tenLop ||
            maLop ||
            "Lớp chưa đặt tên";


        if (!classes.some(
            x =>
                x.value ===
                (maLop || display)
        )) {

            classes.push({

                value:
                    maLop || display,

                name:
                    display

            });

        }


        console.log(
            "Đã thêm lớp:",
            display,
            "| Mã:",
            maLop
        );

    });


    classes.forEach(item => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            item.value;

        option.textContent =
            item.name;

        select.appendChild(
            option
        );

    });


    /*
       Chọn lớp đầu tiên.
    */

    if (classes.length > 0) {

        selectedClass =
            classes[0].value;

        select.value =
            selectedClass;

    }


    console.log(
        "Danh sách lớp cuối cùng:",
        classes
    );

}


/* =========================================================
   9. LẤY TÊN LỚP
   ========================================================= */

function getClassName(classCode) {

    const row =
        DATA.lop.find(item => {

            const ma =
                text(
                    getValue(
                        item,
                        [
                            "Malop",
                            "MaLop",
                            "Mã lớp"
                        ]
                    )
                );

            const ten =
                text(
                    getValue(
                        item,
                        [
                            "TenLop",
                            "Tên lớp",
                            "Lop",
                            "Lớp"
                        ]
                    )
                );

            return (
                ma === classCode ||
                ten === classCode
            );

        });


    if (!row) {
        return classCode;
    }


    return (
        text(
            getValue(
                row,
                [
                    "TenLop",
                    "Tên lớp",
                    "Lop",
                    "Lớp"
                ]
            )
        ) ||
        classCode
    );

}


/* =========================================================
   10. LỌC HỌC SINH THEO LỚP
   ========================================================= */

function getStudentsByClass() {

    const classCode =
        selectedClass;


    if (!classCode) {
        return [];
    }


    return DATA.hocSinh.filter(
        student => {

            const maLop =
                text(
                    getValue(
                        student,
                        [
                            "MaLop",
                            "Malop",
                            "Mã lớp"
                        ]
                    )
                );


            const lop =
                text(
                    getValue(
                        student,
                        [
                            "TenLop",
                            "Lop",
                            "Lớp"
                        ]
                    )
                );


            return (
                maLop === classCode ||
                lop === classCode
            );

        }
    );

}


/* =========================================================
   11. TÌM KIẾM HỌC SINH
   ========================================================= */

function getFilteredStudents() {

    const students =
        getStudentsByClass();


    const input =
        document.getElementById(
            "studentSearch"
        );


    if (!input) {
        return students;
    }


    const keyword =
        text(
            input.value
        ).toLowerCase();


    if (!keyword) {
        return students;
    }


    return students.filter(
        student => {

            const maHS =
                text(
                    getValue(
                        student,
                        [
                            "MaHS",
                            "Mã HS",
                            "Mahs"
                        ]
                    )
                ).toLowerCase();


            const hoTen =
                text(
                    getValue(
                        student,
                        [
                            "HoTen",
                            "Họ tên",
                            "Họ và tên",
                            "Hoten"
                        ]
                    )
                ).toLowerCase();


            return (
                maHS.includes(keyword) ||
                hoTen.includes(keyword)
            );

        }
    );

}


/* =========================================================
   12. HIỂN THỊ HỌC SINH
   ========================================================= */

function renderStudents() {

    const tbody =
        document.getElementById(
            "studentTableBody"
        );


    if (!tbody) {
        return;
    }


    const students =
        getFilteredStudents();


    tbody.innerHTML =
        "";


    if (students.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    class="empty">

                    Không tìm thấy học sinh.

                </td>
            </tr>
            `;

        return;

    }


    students.forEach(
        (student, index) => {

            const stt =
                getValue(
                    student,
                    [
                        "STT",
                        "Stt"
                    ],
                    index + 1
                );


            const maHS =
                getValue(
                    student,
                    [
                        "MaHS",
                        "Mã HS",
                        "Mahs"
                    ]
                );


            const hoTen =
                getValue(
                    student,
                    [
                        "HoTen",
                        "Họ tên",
                        "Họ và tên",
                        "Hoten"
                    ]
                );


            const ngaySinh =
                getValue(
                    student,
                    [
                        "NgaySinh",
                        "Ngày sinh"
                    ]
                );


            const gioiTinh =
                getValue(
                    student,
                    [
                        "Gioitinh",
                        "GioiTinh",
                        "Giới tính"
                    ]
                );


            const ghiChu =
                getValue(
                    student,
                    [
                        "Ghichu",
                        "GhiChu",
                        "Ghi chú"
                    ]
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>
                        ${escapeHTML(stt)}
                    </td>

                    <td>
                        ${escapeHTML(maHS)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(hoTen || "—")}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(ngaySinh || "—")}
                    </td>

                    <td>
                        ${escapeHTML(gioiTinh || "—")}
                    </td>

                    <td>
                        ${escapeHTML(ghiChu || "—")}
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   13. HIỂN THỊ ĐIỂM
   ========================================================= */

function renderScores() {

    const tbody =
        document.getElementById(
            "scoreTableBody"
        );


    if (!tbody) {
        return;
    }


    const students =
        getFilteredStudents();


    tbody.innerHTML =
        "";


    if (students.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="8"
                    class="empty">

                    Chưa có dữ liệu điểm.

                </td>
            </tr>
            `;

        return;

    }


    students.forEach(
        (student, index) => {

            const maHS =
                text(
                    getValue(
                        student,
                        [
                            "MaHS",
                            "Mã HS"
                        ]
                    )
                );


            const score =
                DATA.diem.find(
                    item => {

                        const itemMaHS =
                            text(
                                getValue(
                                    item,
                                    [
                                        "MaHS",
                                        "Mã HS"
                                    ]
                                )
                            );

                        return (
                            itemMaHS === maHS
                        );

                    }
                );


            const tx1 =
                score
                    ? getValue(
                        score,
                        ["TX1"]
                    )
                    : "";


            const tx2 =
                score
                    ? getValue(
                        score,
                        ["TX2"]
                    )
                    : "";


            const tx3 =
                score
                    ? getValue(
                        score,
                        ["TX3"]
                    )
                    : "";


            const tx4 =
                score
                    ? getValue(
                        score,
                        ["TX4"]
                    )
                    : "";


            const values = [
                tx1,
                tx2,
                tx3,
                tx4
            ]
                .map(
                    numberValue
                )
                .filter(
                    v =>
                        v !== null
                );


            let average = "—";


            if (values.length > 0) {

                const sum =
                    values.reduce(
                        (a, b) =>
                            a + b,
                        0
                    );

                average =
                    (
                        sum /
                        values.length
                    ).toFixed(2);

            }


            const hoTen =
                getValue(
                    student,
                    [
                        "HoTen",
                        "Họ tên",
                        "Họ và tên"
                    ]
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(maHS)}
                    </td>

                    <td>
                        ${escapeHTML(hoTen || "—")}
                    </td>

                    <td>
                        ${escapeHTML(tx1 || "—")}
                    </td>

                    <td>
                        ${escapeHTML(tx2 || "—")}
                    </td>

                    <td>
                        ${escapeHTML(tx3 || "—")}
                    </td>

                    <td>
                        ${escapeHTML(tx4 || "—")}
                    </td>

                    <td>
                        <strong>
                            ${average}
                        </strong>
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   14. HIỂN THỊ THI ĐUA
   ========================================================= */

function renderCompetition() {

    const tbody =
        document.getElementById(
            "competitionTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        "";


    const classData =
        DATA.thiDua.filter(
            item => {

                const maLop =
                    text(
                        getValue(
                            item,
                            [
                                "MaLop",
                                "Malop",
                                "Mã lớp"
                            ]
                        )
                    );

                return (
                    !selectedClass ||
                    maLop === selectedClass
                );

            }
        );


    if (classData.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    class="empty">

                    Chưa có dữ liệu thi đua.

                </td>
            </tr>
            `;

        return;

    }


    classData.forEach(
        (item, index) => {

            const maHS =
                getValue(
                    item,
                    [
                        "MaHS",
                        "Mã HS"
                    ]
                );


            const ngay =
                getValue(
                    item,
                    [
                        "Ngay",
                        "Ngày"
                    ]
                );


            const loai =
                getValue(
                    item,
                    [
                        "Loai",
                        "Loại"
                    ]
                );


            const noiDung =
                getValue(
                    item,
                    [
                        "NoiDung",
                        "Nội dung"
                    ]
                );


            const diem =
                getValue(
                    item,
                    [
                        "Diem",
                        "Điểm"
                    ]
                );


            tbody.innerHTML +=
                `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(maHS || "—")}
                    </td>

                    <td>
                        ${escapeHTML(ngay || "—")}
                    </td>

                    <td>
                        ${escapeHTML(loai || "—")}
                    </td>

                    <td>
                        ${escapeHTML(noiDung || "—")}
                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(diem || "—")}
                        </strong>
                    </td>

                </tr>
                `;

        }
    );

}


/* =========================================================
   15. NGÀY HIỆN TẠI
   ========================================================= */

function getTodayString() {

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


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


/* =========================================================
   16. CHUẨN HÓA NGÀY
   ========================================================= */

function normalizeDate(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    let str =
        String(value).trim();


    /*
       yyyy-mm-dd
    */

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(str)
    ) {
        return str;
    }


    /*
       dd/mm/yyyy
    */

    let match =
        str.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
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


    /*
       Google có thể trả về Date(...)
    */

    if (
        str.startsWith("Date(")
    ) {

        const numbers =
            str
                .replace(
                    /Date\(|\)/g,
                    ""
                )
                .split(",");


        if (numbers.length >= 3) {

            const date =
                new Date(
                    Number(numbers[0]),
                    Number(numbers[1]),
                    Number(numbers[2])
                );


            return (
                date.getFullYear() +
                "-" +
                String(
                    date.getMonth() + 1
                ).padStart(2, "0") +
                "-" +
                String(
                    date.getDate()
                ).padStart(2, "0")
            );

        }

    }


    return str;

}


/* =========================================================
   17. TÌM TRẠNG THÁI ĐIỂM DANH
   ========================================================= */

function getAttendanceStatus(
    maHS,
    date
) {

    const targetDate =
        normalizeDate(date);


    /*
       Tìm bản ghi mới nhất
       đúng học sinh + ngày.
    */

    const record =
        DATA.diemDanh.find(
            item => {

                const itemMaHS =
                    text(
                        getValue(
                            item,
                            [
                                "MaHS",
                                "Mã HS"
                            ]
                        )
                    );


                const itemDate =
                    normalizeDate(
                        getValue(
                            item,
                            [
                                "Ngay",
                                "Ngày"
                            ]
                        )
                    );


                return (
                    itemMaHS === maHS &&
                    itemDate === targetDate
                );

            }
        );


    if (!record) {

        return {
            status: "",
            note: ""
        };

    }


    return {

        status:
            text(
                getValue(
                    record,
                    [
                        "Trangthai",
                        "TrangThai",
                        "Trạng thái"
                    ]
                )
            ),

        note:
            text(
                getValue(
                    record,
                    [
                        "Ghichu",
                        "GhiChu",
                        "Ghi chú"
                    ]
                )
            )

    };

}


/* =========================================================
   18. CHUẨN HÓA TRẠNG THÁI
   ========================================================= */

function normalizeStatus(status) {

    const value =
        normalizeKey(status);


    if (
        [
            "comat",
            "present",
            "co",
            "dihoc",
            "duhoc"
        ].includes(value)
    ) {
        return "present";
    }


    if (
        [
            "dim uon",
            "dimuon",
            "late",
            "muon"
        ].includes(value)
    ) {
        return "late";
    }


    if (
        [
            "vang",
            "absent",
            "nghiphep",
            "nghikoph ep",
            "nghi"
        ].includes(value)
    ) {
        return "absent";
    }


    return "unknown";

}


/* =========================================================
   19. BADGE TRẠNG THÁI
   ========================================================= */

function attendanceBadge(status) {

    const type =
        normalizeStatus(status);


    if (type === "present") {

        return `
            <span class="badge badge-present">
                Có mặt
            </span>
        `;

    }


    if (type === "late") {

        return `
            <span class="badge badge-late">
                Đi muộn
            </span>
        `;

    }


    if (type === "absent") {

        return `
            <span class="badge badge-absent">
                Vắng
            </span>
        `;

    }


    return `
        <span class="badge badge-unknown">
            Chưa xác định
        </span>
    `;

}


/* =========================================================
   20. HIỂN THỊ ĐIỂM DANH
   ========================================================= */

function renderAttendance() {

    const tbody =
        document.getElementById(
            "attendanceTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        "";


    const students =
        getFilteredStudents();


    const dateInput =
        document.getElementById(
            "attendanceDate"
        );


    const date =
        dateInput
            ? dateInput.value
            : getTodayString();


    if (students.length === 0) {

        tbody.innerHTML =
            `
            <tr>
                <td
                    colspan="6"
                    class="empty">

                    Chưa có học sinh.

                </td>
            </tr>
            `;

        updateAttendanceStats();

        return;

    }


    students.forEach(
        (student, index) => {

            const maHS =
                text(
                    getValue(
                        student,
                        [
                            "MaHS",
                            "Mã HS"
                        ]
                    )
                );


            const hoTen =
                text(
                    getValue(
                        student,
                        [
                            "HoTen",
                            "Họ tên",
                            "Họ và tên"
                        ]
                    )
                );


            const attendance =
                getAttendanceStatus(
                    maHS,
                    date
                );


            const displayDate =
                date
                    ? formatDateVN(date)
                    : "—";


            tbody.innerHTML +=
                `
                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(maHS)}
                    </td>

                    <td>
                        ${escapeHTML(hoTen || "—")}
                    </td>

                    <td>
                        ${
                            attendance.status
                                ? attendanceBadge(
                                    attendance.status
                                )
                                : attendanceBadge("")
                        }
                    </td>

                    <td>
                        ${displayDate}
                    </td>

                    <td>
                        ${escapeHTML(
                            attendance.note || "—"
                        )}
                    </td>

                </tr>
                `;

        }
    );


    updateAttendanceStats();

}


/* =========================================================
   21. ĐỊNH DẠNG NGÀY VIỆT NAM
   ========================================================= */

function formatDateVN(date) {

    if (!date) {
        return "";
    }


    const parts =
        date.split("-");


    if (parts.length !== 3) {
        return date;
    }


    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}


/* =========================================================
   22. THỐNG KÊ ĐIỂM DANH
   ========================================================= */

function updateAttendanceStats() {

    const students =
        getFilteredStudents();


    const dateInput =
        document.getElementById(
            "attendanceDate"
        );


    const date =
        dateInput
            ? dateInput.value
            : getTodayString();


    let present = 0;

    let late = 0;

    let absent = 0;

    let unknown = 0;


    students.forEach(
        student => {

            const maHS =
                text(
                    getValue(
                        student,
                        [
                            "MaHS",
                            "Mã HS"
                        ]
                    )
                );


            const record =
                getAttendanceStatus(
                    maHS,
                    date
                );


            const type =
                normalizeStatus(
                    record.status
                );


            if (type === "present") {

                present++;

            }
            else if (
                type === "late"
            ) {

                late++;

            }
            else if (
                type === "absent"
            ) {

                absent++;

            }
            else {

                unknown++;

            }

        }
    );


    setText(
        "totalCount",
        students.length
    );


    setText(
        "presentCount",
        present
    );


    setText(
        "lateCount",
        late
    );


    setText(
        "absentCount",
        absent
    );


    setText(
        "unknownCount",
        unknown
    );

}


/* =========================================================
   23. SET TEXT
   ========================================================= */

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


/* =========================================================
   24. RENDER TOÀN BỘ
   ========================================================= */

function renderAll() {

    console.log(
        "Đang render giao diện..."
    );


    renderStudents();

    renderScores();

    renderCompetition();

    renderAttendance();

    updateAttendanceStats();


    console.log(
        "Đã render xong."
    );

}


/* =========================================================
   25. THAY ĐỔI LỚP
   ========================================================= */

function handleClassChange(event) {

    selectedClass =
        event.target.value;


    console.log(
        "Lớp được chọn:",
        selectedClass
    );


    renderAll();

}


/* =========================================================
   26. TÌM KIẾM
   ========================================================= */

function handleSearch() {

    renderAll();

}


/* =========================================================
   27. THAY ĐỔI NGÀY
   ========================================================= */

function handleDateChange() {

    renderAttendance();

    updateAttendanceStats();

}


/* =========================================================
   28. CAMERA
   ========================================================= */

async function startCamera() {

    const video =
        document.getElementById(
            "camera"
        );


    const status =
        document.getElementById(
            "cameraStatus"
        );


    if (!navigator.mediaDevices) {

        if (status) {

            status.textContent =
                "Trình duyệt không hỗ trợ camera.";

        }

        return;

    }


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "user"
                },

                audio: false

            });


        if (video) {

            video.srcObject =
                cameraStream;

        }


        if (status) {

            status.textContent =
                "🟢 Camera đang hoạt động.";

        }

    }
    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        if (status) {

            status.textContent =
                "❌ Không thể bật camera: " +
                error.message;

        }

    }

}


/* =========================================================
   29. TẮT CAMERA
   ========================================================= */

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

        cameraStream =
            null;

    }


    const video =
        document.getElementById(
            "camera"
        );


    if (video) {

        video.srcObject =
            null;

    }


    const status =
        document.getElementById(
            "cameraStatus"
        );


    if (status) {

        status.textContent =
            "Camera đã tắt.";

    }

}


/* =========================================================
   30. GẮN SỰ KIỆN
   ========================================================= */

function setupEvents() {

    const classSelect =
        document.getElementById(
            "classSelect"
        );


    if (classSelect) {

        classSelect.addEventListener(
            "change",
            handleClassChange
        );

    }


    const studentSearch =
        document.getElementById(
            "studentSearch"
        );


    if (studentSearch) {

        studentSearch.addEventListener(
            "input",
            handleSearch
        );

    }


    const attendanceDate =
        document.getElementById(
            "attendanceDate"
        );


    if (attendanceDate) {

        attendanceDate.value =
            getTodayString();


        attendanceDate.addEventListener(
            "change",
            handleDateChange
        );

    }


    const reloadBtn =
        document.getElementById(
            "reloadBtn"
        );


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

}


/* =========================================================
   31. KHỞI ĐỘNG APP
   ========================================================= */

async function initApp() {

    console.log(
        "================================="
    );

    console.log(
        "ỨNG DỤNG BẮT ĐẦU..."
    );

    console.log(
        "================================="
    );


    setupEvents();


    await loadAllData();

}


/* =========================================================
   32. CHẠY APP
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initApp
);

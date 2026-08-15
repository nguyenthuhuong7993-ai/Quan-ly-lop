// ==========================================
// CẤU HÌNH API
// ==========================================

const API_URL =
    "https://script.google.com/macros/s/AKfycbzXfW5EFKL3mKljkjEfFfhxPf2BrnaKJ_rNvUPSkQ8vA0XvnWwzu9buP4UsUiE81b2T/exec";


// ==========================================
// DỮ LIỆU
// ==========================================

let classes = [];
let students = [];


// ==========================================
// KHI TRANG ĐƯỢC MỞ
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const classSelect =
        document.getElementById("classSelect");

    const searchInput =
        document.getElementById("searchInput");


    // Khi chọn lớp
    classSelect.addEventListener("change", function () {

        displayStudents(this.value);

    });


    // Khi tìm kiếm học sinh
    searchInput.addEventListener("input", function () {

        const classId =
            classSelect.value;

        displayStudents(classId);

    });


    // Tải dữ liệu
    loadClasses();

});


// ==========================================
// TẢI DANH SÁCH LỚP
// ==========================================

async function loadClasses() {

    try {

        showLoading(true);

        const response =
            await fetch(API_URL + "?action=getClasses");

        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.error || "Không thể lấy danh sách lớp"
            );

        }


        classes =
            result.data || [];


        // Hiển thị số lớp
        document.getElementById("classCount")
            .textContent = classes.length;


        // Hiển thị danh sách lớp
        renderClasses();


        // Tiếp tục tải học sinh
        await loadStudents();


        // Sau khi tải xong dữ liệu,
        // tự động chọn lớp đầu tiên nếu có

        const classSelect =
            document.getElementById("classSelect");


        if (classes.length > 0) {

            classSelect.value =
                classes[0].MaLop;

            displayStudents(
                classes[0].MaLop
            );

        }


        showLoading(false);


    } catch (error) {

        console.error(
            "Lỗi loadClasses:",
            error
        );


        showMessage(
            "Không thể tải danh sách lớp."
        );


        showLoading(false);

    }

}


// ==========================================
// TẢI DANH SÁCH HỌC SINH
// ==========================================

async function loadStudents() {

    try {

        const response =
            await fetch(API_URL + "?action=getStudents");


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.error || "Không thể lấy danh sách học sinh"
            );

        }


        students =
            result.data || [];


        // Hiển thị tổng số học sinh
        document.getElementById("studentCount")
            .textContent = students.length;


        console.log(
            "Đã tải học sinh:",
            students
        );


    } catch (error) {

        console.error(
            "Lỗi loadStudents:",
            error
        );


        showMessage(
            "Không thể tải danh sách học sinh."
        );

    }

}


// ==========================================
// HIỂN THỊ DANH SÁCH LỚP
// ==========================================

function renderClasses() {

    const select =
        document.getElementById("classSelect");


    select.innerHTML = "";


    // Dòng mặc định
    const defaultOption =
        document.createElement("option");


    defaultOption.value = "";

    defaultOption.textContent =
        "-- Chọn lớp --";


    select.appendChild(
        defaultOption
    );


    // Thêm từng lớp
    classes.forEach(function (item) {

        const option =
            document.createElement("option");


        option.value =
            String(item.MaLop).trim();


        option.textContent =
            item.TenLop;


        select.appendChild(
            option
        );

    });

}


// ==========================================
// HIỂN THỊ HỌC SINH
// ==========================================

function displayStudents(classId) {

    const container =
        document.getElementById("studentList");


    const selectedClass =
        document.getElementById("selectedClass");


    const searchInput =
        document.getElementById("searchInput");


    // Xóa danh sách cũ
    container.innerHTML = "";


    // Nếu chưa chọn lớp
    if (!classId) {

        selectedClass.textContent =
            "Chưa chọn lớp";


        container.innerHTML =
            '<div class="loading">Không có học sinh.</div>';


        return;

    }


    // Tìm tên lớp
    const currentClass =
        classes.find(function (item) {

            return String(item.MaLop).trim() ===
                   String(classId).trim();

        });


    if (currentClass) {

        selectedClass.textContent =
            currentClass.TenLop;

    } else {

        selectedClass.textContent =
            "Lớp " + classId;

    }


    // Từ khóa tìm kiếm
    const keyword =
        String(searchInput.value || "")
            .trim()
            .toLowerCase();


    console.log(
        "Đang chọn lớp:",
        classId
    );


    console.log(
        "Tổng số học sinh:",
        students.length
    );


    // Lọc học sinh theo lớp
    const filteredStudents =
        students.filter(function (student) {

            const studentClass =
                String(student.MaLop || "")
                    .trim();


            const studentName =
                String(student.HoTen || "")
                    .trim()
                    .toLowerCase();


            const sameClass =
                studentClass ===
                String(classId).trim();


            const matchName =
                studentName.includes(keyword);


            return sameClass && matchName;

        });


    console.log(
        "Học sinh sau khi lọc:",
        filteredStudents
    );


    // Không có học sinh
    if (filteredStudents.length === 0) {

        container.innerHTML =
            '<div class="loading">Không có học sinh.</div>';

        return;

    }


    // ======================================
    // TẠO TỪNG HỌC SINH
    // ======================================

    filteredStudents.forEach(
        function (student) {


            // Thẻ học sinh
            const card =
                document.createElement("div");


            card.className =
                "student-card";


            // Số thứ tự
            const number =
                document.createElement("div");


            number.className =
                "student-number";


            number.textContent =
                student.STT || "";


            // Phần thông tin
            const info =
                document.createElement("div");


            info.className =
                "student-info";


            // Tên học sinh
            const name =
                document.createElement("div");


            name.className =
                "student-name";


            name.textContent =
                student.HoTen || "";


            // Mã học sinh
            const code =
                document.createElement("div");


            code.className =
                "student-code";


            code.textContent =
                "Mã HS: " +
                (student.MaHS || "");


            // Ghép các phần
            info.appendChild(name);

            info.appendChild(code);

            card.appendChild(number);

            card.appendChild(info);

            container.appendChild(card);

        }
    );

}


// ==========================================
// HIỂN THỊ / ẨN LOADING
// ==========================================

function showLoading(show) {

    const loading =
        document.getElementById("loading");


    if (!loading) {

        return;

    }


    loading.style.display =
        show ? "block" : "none";

}


// ==========================================
// THÔNG BÁO
// ==========================================

function showMessage(text) {

    const message =
        document.getElementById("message");


    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.style.display =
        "block";


    setTimeout(
        function () {

            message.style.display =
                "none";

        },
        3000
    );

}

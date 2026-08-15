```javascript
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

    console.log("APP.JS ĐÃ ĐƯỢC TẢI");

    const classSelect =
        document.getElementById("classSelect");

    const searchInput =
        document.getElementById("searchInput");


    // Khi chọn lớp
    classSelect.addEventListener("change", function () {

        console.log("ĐÃ CHỌN LỚP:", this.value);

        displayStudents(this.value);

    });


    // Khi tìm kiếm học sinh
    searchInput.addEventListener("input", function () {

        const classId =
            classSelect.value;

        displayStudents(classId);

    });


    // Tải dữ liệu
    loadData();

});


// ==========================================
// TẢI TOÀN BỘ DỮ LIỆU
// ==========================================

async function loadData() {

    try {

        showLoading(true);

        console.log("Đang tải danh sách lớp...");


        // -------------------------------
        // LẤY DANH SÁCH LỚP
        // -------------------------------

        const classResponse =
            await fetch(
                API_URL + "?action=getClasses"
            );

        const classResult =
            await classResponse.json();


        console.log(
            "Dữ liệu lớp:",
            classResult
        );


        if (!classResult.success) {

            throw new Error(
                classResult.error ||
                "Không lấy được danh sách lớp"
            );

        }


        classes =
            classResult.data || [];


        console.log(
            "Số lớp:",
            classes.length
        );


        renderClasses();


        document.getElementById("classCount")
            .textContent =
            classes.length;


        // -------------------------------
        // LẤY DANH SÁCH HỌC SINH
        // -------------------------------

        console.log(
            "Đang tải danh sách học sinh..."
        );


        const studentResponse =
            await fetch(
                API_URL + "?action=getStudents"
            );


        const studentResult =
            await studentResponse.json();


        console.log(
            "Dữ liệu học sinh:",
            studentResult
        );


        if (!studentResult.success) {

            throw new Error(
                studentResult.error ||
                "Không lấy được danh sách học sinh"
            );

        }


        students =
            studentResult.data || [];


        console.log(
            "Số học sinh:",
            students.length
        );


        document.getElementById("studentCount")
            .textContent =
            students.length;


        // -------------------------------
        // HIỂN THỊ LỚP ĐẦU TIÊN
        // -------------------------------

        if (classes.length > 0) {

            const firstClass =
                String(
                    classes[0].MaLop || ""
                ).trim();


            console.log(
                "Lớp đầu tiên:",
                firstClass
            );


            document.getElementById(
                "classSelect"
            ).value =
                firstClass;


            displayStudents(firstClass);

        } else {

            document.getElementById(
                "selectedClass"
            ).textContent =
                "Chưa có lớp";

        }


        showLoading(false);


    } catch (error) {

        console.error(
            "LỖI:",
            error
        );


        showMessage(
            "Không thể tải dữ liệu: " +
            error.message
        );


        showLoading(false);

    }

}


// ==========================================
// HIỂN THỊ DANH SÁCH LỚP
// ==========================================

function renderClasses() {

    const select =
        document.getElementById(
            "classSelect"
        );


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


        const maLop =
            String(
                item.MaLop || ""
            ).trim();


        const tenLop =
            String(
                item.TenLop ||
                item.MaLop ||
                ""
            ).trim();


        option.value =
            maLop;


        option.textContent =
            "Lớp " + tenLop;


        select.appendChild(
            option
        );

    });


    console.log(
        "Đã tạo danh sách lớp:",
        select.innerHTML
    );

}


// ==========================================
// HIỂN THỊ DANH SÁCH HỌC SINH
// ==========================================

function displayStudents(classId) {

    const container =
        document.getElementById(
            "studentList"
        );


    const className =
        document.getElementById(
            "selectedClass"
        );


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    // Xóa danh sách cũ
    container.innerHTML = "";


    // Chuẩn hóa mã lớp
    classId =
        String(
            classId || ""
        ).trim();


    console.log(
        "DISPLAY STUDENTS - classId:",
        classId
    );


    // Nếu chưa chọn lớp
    if (!classId) {

        className.textContent =
            "Chưa chọn lớp";


        container.innerHTML =
            '<div class="loading">Vui lòng chọn lớp.</div>';


        return;

    }


    // ======================================
    // TÌM TÊN LỚP
    // ======================================

    const selectedClass =
        classes.find(function (item) {

            return String(
                item.MaLop || ""
            ).trim() === classId;

        });


    if (selectedClass) {

        className.textContent =
            selectedClass.TenLop ||
            ("Lớp " + classId);

    } else {

        className.textContent =
            "Lớp " + classId;

    }


    // ======================================
    // TỪ KHÓA TÌM KIẾM
    // ======================================

    const keyword =
        String(
            searchInput.value || ""
        )
        .trim()
        .toLowerCase();


    // ======================================
    // LỌC HỌC SINH
    // ======================================

    console.log(
        "Tổng học sinh:",
        students.length
    );


    const filteredStudents =
        students.filter(function (student) {

            const studentClass =
                String(
                    student.MaLop || ""
                ).trim();


            const studentName =
                String(
                    student.HoTen || ""
                )
                .trim()
                .toLowerCase();


            console.log(
                "Kiểm tra:",
                student.MaHS,
                studentClass,
                studentName
            );


            return (
                studentClass === classId &&
                studentName.includes(keyword)
            );

        });


    console.log(
        "Học sinh của lớp " +
        classId +
        ":",
        filteredStudents
    );


    // ======================================
    // KHÔNG CÓ HỌC SINH
    // ======================================

    if (
        filteredStudents.length === 0
    ) {

        container.innerHTML =
            '<div class="loading">Không có học sinh.</div>';


        return;

    }


    // ======================================
    // HIỂN THỊ HỌC SINH
    // ======================================

    filteredStudents.forEach(
        function (student) {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "student-card";


            card.innerHTML = `

                <div class="student-number">
                    ${student.STT || ""}
                </div>

                <div class="student-info">

                    <div class="student-name">
                        ${student.HoTen || ""}
                    </div>

                    <div class="student-code">
                        Mã HS: ${student.MaHS || ""}
                    </div>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


// ==========================================
// HIỂN THỊ LOADING
// ==========================================

function showLoading(show) {

    const loading =
        document.getElementById(
            "loading"
        );


    if (!loading) {
        return;
    }


    loading.style.display =
        show
            ? "block"
            : "none";

}


// ==========================================
// THÔNG BÁO
// ==========================================

function showMessage(text) {

    const message =
        document.getElementById(
            "message"
        );


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
        5000
    );

}
```

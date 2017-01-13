$(document).ready( function () {
    $('#table_id').DataTable({
        paging:false,
        fixedColumns: true,
        "scrollX": true,
        ajax:"/api/RE-VRC-16-1323/skills",
        "columns": [
            { "data": "team" },
            { "data": "robot" },
            { "data": "prog" },
            { "data": "total"}
        ]
        /*"aaSorting": [[ 1, "asc" ], [2, "asc"], [3, "asc"], [4, "asc"]]*/
    });
} );
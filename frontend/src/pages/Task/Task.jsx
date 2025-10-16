import React from "react";
import { Typography, Table } from "antd";

const { Title } = Typography;

const columns = [
  { title: "Task ID", dataIndex: "id", key: "id" },
  { title: "Task Name", dataIndex: "name", key: "name" },
  { title: "Status", dataIndex: "status", key: "status" },
];

const data = [
  { id: "T-001", name: "Review new transcription request", status: "Pending" },
  {
    id: "T-002",
    name: "Assign transcriber for Project X",
    status: "In Progress",
  },
];

const Tasks = () => {
  return (
    <div>
      <Title level={2}>Manage Tasks</Title>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </div>
  );
};

export default Tasks;

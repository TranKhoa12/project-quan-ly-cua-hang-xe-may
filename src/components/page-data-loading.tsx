export default function PageDataLoading() {
  return <section className="panel data-loading" role="status" aria-label="Đang tải nội dung"><p>Đang tải dữ liệu...</p>{[0,1,2].map(i=><div key={i} className="loading-row"/>)}</section>;
}

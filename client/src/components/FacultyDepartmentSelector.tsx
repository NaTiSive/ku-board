import type { ChangeEvent } from 'react'

const facultyOptions = [
  { value: 'science', label: 'คณะวิทยาศาสตร์' },
  { value: 'engineering', label: 'คณะวิศวกรรมศาสตร์' },
  { value: 'agriculture', label: 'คณะเกษตรศาสตร์' },
  { value: 'economics', label: 'คณะเศรษฐศาสตร์' },
  { value: 'humanities', label: 'คณะมนุษยศาสตร์' },
]

const departmentMap: Record<string, { value: string; label: string }[]> = {
  science: [
    { value: 'biology', label: 'ชีววิทยา' },
    { value: 'chemistry', label: 'เคมี' },
    { value: 'physics', label: 'ฟิสิกส์' },
    { value: 'cs', label: 'วิทยาการคอมพิวเตอร์' },
  ],
  engineering: [
    { value: 'civil', label: 'วิศวกรรมโยธา' },
    { value: 'mechanical', label: 'วิศวกรรมเครื่องกล' },
    { value: 'electrical', label: 'วิศวกรรมไฟฟ้า' },
  ],
  agriculture: [
    { value: 'agronomy', label: 'พืชไร่' },
    { value: 'animal', label: 'สัตวศาสตร์' },
    { value: 'soil', label: 'ปฐพีวิทยา' },
  ],
  economics: [
    { value: 'eco', label: 'เศรษฐศาสตร์' },
    { value: 'business', label: 'บริหารธุรกิจ' },
  ],
  humanities: [
    { value: 'english', label: 'ภาษาอังกฤษ' },
    { value: 'thai', label: 'ภาษาไทย' },
  ],
}

interface FacultyDepartmentSelectorProps {
  selectedFaculty: string
  selectedDepartment: string
  onFacultyChange: (faculty: string) => void
  onDepartmentChange: (department: string) => void
  facultyError?: string
  departmentError?: string
}

export default function FacultyDepartmentSelector({
  selectedFaculty,
  selectedDepartment,
  onFacultyChange,
  onDepartmentChange,
  facultyError,
  departmentError,
}: FacultyDepartmentSelectorProps) {
  const departments = departmentMap[selectedFaculty] ?? []

  const handleFacultyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextFaculty = event.target.value
    onFacultyChange(nextFaculty)
    if (nextFaculty !== selectedFaculty) {
      onDepartmentChange('')
    }
  }

  return (
    <div className="form-grid">
      <label>
        คณะ
        <select className="text-input" value={selectedFaculty} onChange={handleFacultyChange}>
          <option value="">เลือกคณะ</option>
          {facultyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {facultyError && <span className="field-error">{facultyError}</span>}
      </label>
      <label>
        ภาควิชา
        <select
          className="text-input"
          value={selectedDepartment}
          onChange={(event) => onDepartmentChange(event.target.value)}
          disabled={!selectedFaculty}
        >
          <option value="">เลือกภาควิชา</option>
          {departments.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {departmentError && <span className="field-error">{departmentError}</span>}
      </label>
    </div>
  )
}

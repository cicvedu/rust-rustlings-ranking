import React, { useState, useMemo, useEffect } from 'react'
import { Table, Modal, Input } from 'antd'
import dayjs from 'dayjs'
import { orderBy, toInteger } from 'lodash'
import './index.less'
import Icon from '../Icon'
import type { ColumnsType } from 'antd/lib/table'
import { AvatarInfo } from '../AvatarInfo'

const { Search } = Input;

interface StudentInfo {
  name: string
  avatar?: string
  grades: any
  rank?: number
  total?: number
  lastUpdateAt?: number | null
}

interface IProps {
  refreshKey: string
  isMobile?: boolean
  latestUpdatedAt?: number
  apiUseCount?: number
  columns: Array<string>
  students: StudentInfo[]
}

const ClassRoomRank = (props: IProps) => {
  const [search, setSearch] = useState("");
  const classroomId = props.refreshKey
  const isMobile = props.isMobile
  const columns: ColumnsType<StudentInfo> = useMemo(
    () => [
      {
        title: '排名',
        dataIndex: 'rank',
        align: 'center',
        fixed: true,
        width: 80,
        key: 'rank',
        render(text: number) {
          let content: React.ReactNode = text
          switch (text) {
            case 1:
              content = <Icon symbol="icon-autojiangbei-" />
              break
            case 2:
              content = <Icon symbol="icon-autojiangbei-1" />
              break
            case 3:
              content = <Icon symbol="icon-autojiangbei-2" />
              break
            default:
              break
          }
          return <span className="rank-modal">{content}</span>
        }
      },
      {
        title: '',
        align: 'center',
        dataIndex: 'name',
        fixed: true,
        width: 50,
        key: 'repoOwner1',
        render(text: string, record: StudentInfo) {
          return <AvatarInfo rank={record.rank} avatarURL={record.avatar} name='' />
        }
      },
      {
        title: '学生',
        align: 'center',
        dataIndex: 'name',
        fixed: true,
        width: 120,
        key: 'repoOwner',
        render(text: string, record: StudentInfo) {
          return <AvatarInfo rank={record.rank} avatarURL='' name={text} />
        }
      },
      ...(props.columns.map((item, index) => {
        return {
          title: item == 'main' ? '总分' : item,
          dataIndex: `assignments-${item}`,
          width: 200,
          align: 'center',
          key: '',
          render(_text: string, record: StudentInfo) {
            let grade = record.grades[item as keyof typeof record.grades];
            if(grade) {
              return <span>{grade}</span>
            }
            return <span>-</span>
          }
        }
      }) as ColumnsType<StudentInfo>),
      {
        title: '最后提交时间',
        align: 'center',
        dataIndex: 'lastUpdateAt',
        fixed: true,
        key: 'lastUpdateAt',
        render(text: number | null | undefined, record: StudentInfo) {
          if(text == null || text == undefined) {
            return '-';
          }
          return dayjs(text).locale("Asia/Beijing").format("YYYY/MM/DD HH:mm");
          // return <AvatarInfo rank={record.rank} avatarURL={record.avatar} name={text} />
        }
      },
      {
        title: '',
        dataIndex: 'none',
        key: 'none'
      }
    ],
    // eslint-disable-next-line
    [classroomId]
  )

  let dataSource: StudentInfo[] = useMemo(() => {
    const studentsList = props.students.map((item, index) => {
      let total = 0;
      for(let i in item.grades) {
        total += toInteger(item.grades[i]);
      }
      item['total'] = total;
      return item;
    });
    let students = orderBy(studentsList, ['total', 'lastUpdateAt'], ['desc', 'asc']);
    for(let i = 0; i < students.length; i++) {
      students[i].rank = i + 1;
    }
    return students;
  }, [classroomId]);

  console.log(props.students)

  // Filter data source by search data
  dataSource = dataSource.filter((item) => {
    console.log(item.name.indexOf(search))
    return item.name.indexOf(search) >= 0;
  })

  return (
    <>
      <div style={{ margin: '1em'}}>
        <div className="classrank-header" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: '1em',
          marginBottom: '1em',
        }}>
          <Search
            placeholder='请输入要搜索的关键词'
            onSearch={(query) => {
              setSearch(query)
            }}
            style = {{width: '20em', marginLeft: '2em'}}
          />
          <div style={{flex: 1}}></div>
          { !isMobile ? 
              <span className="update-time" style={{marginRight: '4em'}}>
                最新数据更新时间:
                {props.latestUpdatedAt && (
                  <span style={{ marginLeft: 10, fontWeight: 'bold' }}>
                    {dayjs(props.latestUpdatedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </span>
                )}
              </span> : <></>
          }
        </div>
        { isMobile ?               
          <div style={{ alignItems: 'center', paddingLeft: "2em" }}>
            <span>
            最新数据更新时间:
            </span>
            {props.latestUpdatedAt && (
              <span style={{ fontWeight: 'bold' }}>
                {dayjs(props.latestUpdatedAt).format('YYYY-MM-DD HH:mm::ss')}
              </span>
            )}
          </div> : <></>
          }
        <Table
          className="rank-table"
          scroll={{ x: 1000 }}
          rowKey={'name'}
          dataSource={dataSource}
          columns={columns}
          size="middle"
        />
      </div>
      {/* <StatisticModal
        classroom={props.classroom}
        visible={statisticVisible}
        onCancel={() => setStatisticVisible(false)}
      /> */}
    </>
  )
}

export default ClassRoomRank

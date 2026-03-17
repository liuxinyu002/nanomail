import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  type Relation
} from 'typeorm'
import { Todo } from './Todo.entity'

/**
 * BoardColumn Entity
 * Represents a column in the Kanban board (e.g., Inbox, Todo, In Progress, Done)
 *
 * System columns (isSystem: 1) cannot be deleted - this includes the default "Inbox" column
 */
@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'text', nullable: true })
  color!: string | null

  @Column({ type: 'integer', default: 0 })
  order!: number

  @Column({ type: 'integer', default: 0 })
  isSystem!: number // 1 = system column (Inbox), cannot be deleted

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @OneToMany(() => Todo, (todo) => todo.boardColumn)
  todos!: Relation<Todo[]>
}